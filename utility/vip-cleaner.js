import fs from "fs";
import { exec } from "child_process";
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";
import options from "../config.js";

loadEnv();

const fsp = fs.promises;
const { adminsCfgPath, adminsCfgBackups, syncconfigPath } = options;
const DB_URL = process.env.DATABASE_URL;
const DB_NAME = "SquadJS";
const DB_COLLECTION = "mainstats";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const VIP_ROLE_ID = process.env.VIP_ROLE_ID;
const vipCleaner = (client) => {
  const INTERVAL_MS = 36000000; // 10 часов

  if (!DB_URL) {
    console.error("[vipCleaner] Не задан DATABASE_URL в окружении");
    return;
  }
  if (!DISCORD_GUILD_ID || !VIP_ROLE_ID) {
    console.error(
      "[vipCleaner] Не заданы DISCORD_GUILD_ID или VIP_ROLE_ID в окружении"
    );
    return;
  }

  setInterval(async () => {
    const clientdb = new MongoClient(DB_URL);
    console.log("[vipCleaner] Старт цикла проверки VIP...");

    try {
      await clientdb.connect();
      const db = clientdb.db(DB_NAME);
      const collection = db.collection(DB_COLLECTION);
      const now = new Date();
      const expiredUsers = await collection
        .find(
          { vipEndDate: { $lte: now } },
          { projection: { _id: 1, discordid: 1 } }
        )
        .toArray();

      const expiredSteamIds = expiredUsers
        .map((u) => u._id)
        .filter((id) => typeof id === "string" && id.length > 0);

      const expiredDiscordIds = expiredUsers
        .map((u) => u.discordid)
        .filter((id) => typeof id === "string" && id.length > 0);

      if (expiredSteamIds.length) {
        await collection.updateMany(
          { _id: { $in: expiredSteamIds } },
          { $unset: { vipEndDate: "" } }
        );
        console.log(
          `[vipCleaner] Найдено и очищено просроченных VIP в БД: ${expiredSteamIds.length}`
        );
      } else {
        console.log("[vipCleaner] Просроченных VIP в БД не найдено.");
      }

      const adminsFilePath = `${adminsCfgPath}Admins.cfg`;
      let originalData = await fsp.readFile(adminsFilePath, "utf-8");

      if (!originalData.match(/\r\n/gm)) {
        originalData = originalData.replace(/\n/gm, "\r\n");
      }

      const lines = originalData.split("\r\n");
      let lastEndIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("//END")) {
          lastEndIndex = i;
        }
      }
      const playerStartIndex = lastEndIndex >= 0 ? lastEndIndex + 1 : 0;

      const filteredLines = [];
      const removedLines = [];
      const activeVipSteamSet = new Set();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (i >= playerStartIndex) {
          const match = line.match(/^Admin=(\d+):Reserved/);
          if (match) {
            const steamIdInFile = match[1];

            if (expiredSteamIds.includes(steamIdInFile)) {
              removedLines.push(line);
              continue;
            }
            activeVipSteamSet.add(steamIdInFile);
          }
        }

        filteredLines.push(line);
      }

      const activeVipSteamIds = Array.from(activeVipSteamSet);

      if (removedLines.length) {
        const newData = filteredLines.join("\r\n");

        await fsp.writeFile(adminsFilePath, newData);
        console.log(
          "\x1b[33m",
          "\r\n[vipCleaner] Removed VIP users from Admins.cfg:\r\n"
        );
        removedLines.forEach((e) => {
          console.log("\x1b[36m", e);
        });

        const backupName = `AdminsBackup${new Date().toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
        })}.cfg`;

        await fsp.writeFile(`${adminsCfgBackups}/${backupName}`, originalData);
        console.log(
          "\x1b[33m",
          "\r\n[vipCleaner] Backup created",
          backupName,
          "\r\n"
        );

        await new Promise((resolve, reject) => {
          exec(`${syncconfigPath}syncconfig.sh`, (execErr, stdout, stderr) => {
            if (execErr) {
              console.error(
                "[vipCleaner] Ошибка запуска syncconfig.sh:",
                execErr
              );
              return reject(execErr);
            }
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
            resolve();
          });
        });
      } else {
        console.log(
          "[vipCleaner] В Admins.cfg никого не удалили, backup/sync не делаем."
        );
      }

      let validVipDiscordIds = [];

      if (activeVipSteamIds.length) {
        const docs = await collection
          .find(
            { _id: { $in: activeVipSteamIds } },
            { projection: { discordid: 1 } }
          )
          .toArray();

        validVipDiscordIds = docs
          .map((d) => d.discordid)
          .filter((id) => typeof id === "string" && id.length > 0);

        console.log(
          `[vipCleaner] Активных VIP по Admins.cfg: ${activeVipSteamIds.length}, с discordid в БД: ${validVipDiscordIds.length}`
        );
      } else {
        console.log(
          "[vipCleaner] В Admins.cfg не найдено ни одной VIP-записи Admin=...:Reserved."
        );
      }

      const validVipSet = new Set(validVipDiscordIds);
      const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
      const vipRole = await guild.roles.fetch(VIP_ROLE_ID);

      if (!vipRole) {
        console.error(
          "[vipCleaner] Не удалось найти VIP-роль по VIP_ROLE_ID, синхронизация ролей пропущена."
        );
        return;
      }

      const members = await guild.members.fetch();
      let removedCount = 0;
      let addedCount = 0;

      for (const member of members.values()) {
        const hasRole = member.roles.cache.has(VIP_ROLE_ID);
        const shouldHave = validVipSet.has(member.id);

        if (hasRole && !shouldHave) {
          try {
            await member.roles.remove(
              VIP_ROLE_ID,
              "VIP снят vipCleaner: нет в Admins.cfg или нет discordid в БД"
            );
            removedCount++;
          } catch (err) {
            console.error(
              `[vipCleaner] Не удалось снять VIP с ${member.id}:`,
              err
            );
          }
        }
      }

      for (const discordId of validVipSet) {
        const member = members.get(discordId);
        if (!member) {
          continue;
        }

        if (!member.roles.cache.has(VIP_ROLE_ID)) {
          try {
            await member.roles.add(
              VIP_ROLE_ID,
              "VIP выдан vipCleaner: есть в Admins.cfg и в БД (discordid)"
            );
            addedCount++;
          } catch (err) {
            console.error(
              `[vipCleaner] Не удалось выдать VIP ${discordId}:`,
              err
            );
          }
        }
      }

      console.log(
        `[vipCleaner] Синхронизация ролей завершена. Выдано: ${addedCount}, снято: ${removedCount}.`
      );

      if (expiredDiscordIds.length) {
        console.log(
          `[vipCleaner] Просроченный VIP у Discord ID: ${expiredDiscordIds.join(
            ", "
          )}`
        );
      }
    } catch (err) {
      console.error("[vipCleaner] Общая ошибка работы:", err);
    } finally {
      await clientdb.close().catch(() => {});
    }
  }, INTERVAL_MS);
};

export default {
  vipCleaner,
};
