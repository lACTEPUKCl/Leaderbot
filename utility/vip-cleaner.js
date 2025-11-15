import fs from "fs";
import { exec } from "child_process";
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";
import options from "../config.js";

loadEnv();

const fsp = fs.promises;
const {
  adminsCfgPath,
  adminsCfgBackups,
  syncconfigPath,
  vipExpiredMessage,
  discordServerId,
  vipRoleID,
  donationLink,
} = options;
const DB_URL = process.env.DATABASE_URL;
const DB_NAME = "SquadJS";
const DB_COLLECTION = "mainstats";

async function runCycle(client) {
  if (!DB_URL) {
    console.error("[vipCleaner] Не задан DATABASE_URL в окружении");
    return;
  }
  if (!discordServerId || !vipRoleID) {
    console.error(
      "[vipCleaner] Не заданы discordServerId или vipRoleID в config.js"
    );
    return;
  }

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

    const expiredDiscordPairs = expiredUsers
      .filter(
        (u) =>
          typeof u.discordid === "string" &&
          u.discordid.length > 0 &&
          typeof u._id === "string" &&
          u._id.length > 0
      )
      .map((u) => ({ discordId: u.discordid, steamId: u._id }));

    const expiredDiscordIds = expiredDiscordPairs.map((p) => p.discordId);

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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i >= playerStartIndex) {
        const matchVip = line.match(/^Admin=(\d+):Reserved/);
        if (matchVip) {
          const steamIdInFile = matchVip[1];

          if (expiredSteamIds.includes(steamIdInFile)) {
            removedLines.push(line);
            continue;
          }
        }
      }

      filteredLines.push(line);
    }

    let newData = originalData;
    if (removedLines.length) {
      newData = filteredLines.join("\r\n");

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
        "[vipCleaner] В VIP-блоке Admins.cfg никого не удалили, backup/sync не делаем."
      );
    }

    const linesForSync = newData.split("\r\n");
    const activeSteamSet = new Set();

    for (const line of linesForSync) {
      const matchAnyAdmin = line.match(/^Admin=(\d+):/);
      if (matchAnyAdmin) {
        const steamIdInFile = matchAnyAdmin[1];
        activeSteamSet.add(steamIdInFile);
      }
    }

    const activeSteamIds = Array.from(activeSteamSet);

    let validVipDiscordIds = [];

    if (activeSteamIds.length) {
      const docs = await collection
        .find(
          { _id: { $in: activeSteamIds } },
          { projection: { discordid: 1 } }
        )
        .toArray();

      validVipDiscordIds = docs
        .map((d) => d.discordid)
        .filter((id) => typeof id === "string" && id.length > 0);

      console.log(
        `[vipCleaner] Всего Admin-строк в Admins.cfg: ${activeSteamIds.length}, с discordid в БД: ${validVipDiscordIds.length}`
      );
    } else {
      console.log(
        "[vipCleaner] В Admins.cfg не найдено ни одной строки Admin=...:..."
      );
    }

    const validVipSet = new Set(validVipDiscordIds);
    const guild = await client.guilds.fetch(discordServerId);
    const members = await guild.members.fetch();
    const vipRole = await guild.roles.fetch(vipRoleID);

    if (!vipRole) {
      console.error(
        "[vipCleaner] Не удалось найти VIP-роль по vipRoleID, синхронизация ролей пропущена."
      );
    } else {
      let removedCount = 0;
      let addedCount = 0;

      for (const member of members.values()) {
        const hasRole = member.roles.cache.has(vipRoleID);
        const shouldHave = validVipSet.has(member.id);

        if (hasRole && !shouldHave) {
          try {
            await member.roles.remove(
              vipRoleID,
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

        if (!member.roles.cache.has(vipRoleID)) {
          try {
            await member.roles.add(
              vipRoleID,
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
    }

    if (expiredDiscordPairs.length && vipExpiredMessage) {
      for (const { discordId, steamId } of expiredDiscordPairs) {
        const member = members.get(discordId);
        if (!member) continue;

        const text =
          donationLink && steamId
            ? `${vipExpiredMessage}\n${donationLink}?message=${steamId}`
            : vipExpiredMessage;

        member
          .send(text)
          .catch(() =>
            console.log(
              `[vipCleaner] Невозможно отправить сообщение пользователю ${discordId}`
            )
          );
      }
    }

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
}

const vipCleaner = (client) => {
  const INTERVAL_MS = 36000000;

  runCycle(client).catch((err) =>
    console.error("[vipCleaner] Ошибка при стартовом прогоне:", err)
  );

  setInterval(() => {
    runCycle(client).catch((err) =>
      console.error("[vipCleaner] Ошибка при очередном прогоне:", err)
    );
  }, INTERVAL_MS);
};

export default {
  vipCleaner,
};
