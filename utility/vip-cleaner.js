// Leaderbot/utility/vip-cleaner.js
import fs from "fs";
import { exec } from "child_process";
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";
import options from "../config.js";

loadEnv();

const { adminsCfgPath, adminsCfgBackups, syncconfigPath } = options;

const DB_URL = process.env.DATABASE_URL;
const DB_NAME = "SquadJS";
const DB_COLLECTION = "mainstats";
const vipCleaner = (callback) => {
  const INTERVAL_MS = 36000000;

  if (!DB_URL) {
    console.error("[vipCleaner] Не задан DATABASE_URL в окружении");
    return;
  }

  setInterval(async () => {
    const clientdb = new MongoClient(DB_URL);

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

      if (!expiredUsers.length) {
        return;
      }

      const steamIDsForRemove = expiredUsers
        .map((u) => u._id)
        .filter((id) => typeof id === "string" && id.length > 0);

      const discordIdsForRemove = expiredUsers
        .map((u) => u.discordid)
        .filter((id) => typeof id === "string" && id.length > 0);

      if (!steamIDsForRemove.length) {
        return;
      }

      await collection.updateMany(
        { _id: { $in: steamIDsForRemove } },
        { $unset: { vipEndDate: "" } }
      );

      if (discordIdsForRemove.length) {
        callback(discordIdsForRemove);
      }

      fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf-8", (err, data) => {
        if (err) {
          console.error("[vipCleaner] Ошибка чтения Admins.cfg:", err);
          return;
        }

        if (!data.match(/\r\n/gm)) {
          data = data.replace(/\n/gm, "\r\n");
        }

        const lines = data.split("\r\n");
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
            const match = line.match(/^Admin=(\d+):Reserved/);
            if (match) {
              const steamIdInFile = match[1];
              if (steamIDsForRemove.includes(steamIdInFile)) {
                removedLines.push(line);
                continue;
              }
            }
          }

          filteredLines.push(line);
        }

        if (!removedLines.length) {
          return;
        }

        const newData = filteredLines.join("\r\n");

        fs.writeFile(`${adminsCfgPath}Admins.cfg`, newData, (writeErr) => {
          if (writeErr) {
            console.error("[vipCleaner] Ошибка записи Admins.cfg:", writeErr);
            return;
          }

          console.log(
            "\x1b[33m",
            "\r\n Removed VIP users from Admins.cfg:\r\n"
          );
          removedLines.forEach((e) => {
            console.log("\x1b[36m", e);
          });

          const backupName = `AdminsBackup${new Date().toLocaleString("ru-RU", {
            timeZone: "Europe/Moscow",
          })}.cfg`;

          fs.writeFile(
            `${adminsCfgBackups}/${backupName}`,
            data,
            (backupErr) => {
              if (backupErr) {
                console.error(
                  "[vipCleaner] Ошибка создания бэкапа Admins.cfg:",
                  backupErr
                );
                return;
              }

              console.log(
                "\x1b[33m",
                "\r\n Backup created",
                backupName,
                "\r\n"
              );

              exec(
                `${syncconfigPath}syncconfig.sh`,
                (execErr, stdout, stderr) => {
                  if (execErr) {
                    console.error(
                      "[vipCleaner] Ошибка запуска syncconfig.sh:",
                      execErr
                    );
                    return;
                  }
                  if (stdout) console.log(stdout);
                  if (stderr) console.error(stderr);
                }
              );
            }
          );
        });
      });
    } catch (err) {
      console.error("[vipCleaner] Ошибка работы с базой:", err);
    } finally {
      await clientdb.close().catch(() => {});
    }
  }, INTERVAL_MS);
};

export default {
  vipCleaner,
};
