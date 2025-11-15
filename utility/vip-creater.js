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

const vipCreater = async (steamID, nickname, summ, discordId) => {
  if (!DB_URL) {
    console.error("[vipCreater] Не задан DATABASE_URL в окружении");
    return null;
  }

  const daysToAdd = summ / 9.863;
  const clientdb = new MongoClient(DB_URL);

  let oldVipEndDate = null;
  let newVipEndDate = null;
  let isExtension = false;

  try {
    await clientdb.connect();
    const db = clientdb.db(DB_NAME);
    const collection = db.collection(DB_COLLECTION);
    const now = new Date();
    const user = await collection.findOne({ _id: steamID });

    let baseDate = now;
    if (user && user.vipEndDate instanceof Date && user.vipEndDate > now) {
      baseDate = user.vipEndDate;
      oldVipEndDate = user.vipEndDate;
      isExtension = true;
    }

    newVipEndDate = new Date(
      baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
    );

    await collection.updateOne(
      { _id: steamID },
      {
        $set: {
          vipEndDate: newVipEndDate,
          discordid: discordId,
          name: nickname,
        },
      },
      { upsert: true }
    );

    fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf-8", (err, data) => {
      if (err) {
        console.error("[vipCreater] Ошибка чтения Admins.cfg:", err);
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
      let hasReserved = false;
      const newLines = lines.map((line, idx) => {
        if (
          idx >= playerStartIndex &&
          line.startsWith(`Admin=${steamID}:Reserved`)
        ) {
          hasReserved = true;
          return `Admin=${steamID}:Reserved`;
        }
        return line;
      });

      if (!hasReserved) {
        newLines.push(`Admin=${steamID}:Reserved`);
      }

      const newData = newLines.join("\r\n");

      fs.writeFile(`${adminsCfgPath}Admins.cfg`, newData, (writeErr) => {
        if (writeErr) {
          console.error("[vipCreater] Ошибка записи Admins.cfg:", writeErr);
          return;
        }

        console.log(
          `[vipCreater] User ${nickname} (${steamID}) VIP обновлён/добавлен`
        );

        const backupName = `AdminsBackup${new Date().toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
        })}.cfg`;

        fs.writeFile(`${adminsCfgBackups}/${backupName}`, data, (backupErr) => {
          if (backupErr) {
            console.error(
              "[vipCreater] Ошибка создания бэкапа Admins.cfg:",
              backupErr
            );
            return;
          }

          console.log("[vipCreater] Backup created", backupName);

          exec(`${syncconfigPath}syncconfig.sh`, (execErr, stdout, stderr) => {
            if (execErr) {
              console.error(
                "[vipCreater] Ошибка запуска syncconfig.sh:",
                execErr
              );
              return;
            }
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
          });
        });
      });
    });

    return {
      steamID,
      nickname,
      summ,
      daysToAdd,
      isExtension,
      oldVipEndDate,
      newVipEndDate,
    };
  } catch (err) {
    console.error("[vipCreater] Ошибка работы с базой:", err);
    return null;
  } finally {
    await clientdb.close().catch(() => {});
  }
};

export default {
  vipCreater,
};
