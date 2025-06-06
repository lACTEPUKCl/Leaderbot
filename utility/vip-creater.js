import fs from "fs";
import { exec } from "child_process";
import options from "../config.js";

const regexp =
  /^Admin=(?<steamID>[0-9]*):Reserved [//]* DiscordID (?<discordId>[0-9]*) do (?<date>[0-9]{2}\.[0-9]{2}\.[0-9]{4})/gm;
const getUserRegExp = (steamID) => {
  return new RegExp(
    `Admin=(?<steamID>${steamID}):Reserved [//]* DiscordID (?<discordId>[0-9]*) do (?<date>[0-9]{2}\\.[0-9]{2}\\.[0-9]{4})`
  );
};
const { adminsCfgPath, adminsCfgBackups, syncconfigPath } = options;
const vipCreater = async (steamID, nickname, summ, discordId) => {
  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  };
  let summPerDay = summ / 9.863;
  function getDate(endTime) {
    const currentTime = new Date().getTime();
    const updatedTIme = new Date(currentTime + endTime * 24 * 60 * 60 * 1000);
    const getTime = updatedTIme.toLocaleDateString("en-GB", options);
    const newTime = getTime.replace(/\//g, ".");
    return newTime;
  }
  fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    if (!data.match(/\r\n/gm)) {
      data = data.replace(/\n/gm, "\r\n");
    }
    const nData = data.split("\r\n").map((e) => {
      const userString = e.match(getUserRegExp(steamID));
      if (userString) {
        const { steamID, discordId, date } = userString.groups;
        const splitDate = date.split(".");
        const lastVipDay = new Date(
          `${splitDate[1]} ${splitDate[0]} ${splitDate[2]}`
        );
        const remaining = lastVipDay - Date.now();
        const remToDays = remaining / 24 / 60 / 60 / 1000;
        const newVipDay = summPerDay + remToDays;
        summPerDay = newVipDay;
        const endTime = getDate(summPerDay);
        const newText = `Admin=${steamID}:Reserved // DiscordID ${discordId} do ${endTime}`;
        return newText;
      }
      return e;
    });
    const hasReserved = data.includes(`Admin=${steamID}:Reserved`);
    if (!hasReserved) {
      const newData = getDate(summPerDay);
      nData.push(
        `Admin=${steamID}:Reserved // DiscordID ${discordId} do ${newData}`
      );
    }
    const newData = nData.join("\r\n");

    if (newData.length) {
      fs.writeFile(`${adminsCfgPath}Admins.cfg`, newData, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`User ${nickname} added`);

        fs.writeFile(
          `${adminsCfgBackups}/AdminsBackup${new Date().toLocaleString(
            "ru-RU",
            {
              timeZone: "Europe/Moscow",
            }
          )}.cfg`,
          data,
          (err) => {
            if (err) {
              console.error(err);
              return;
            }

            console.log("\x1b[33m", "\r\n Backup created AdminsBackup.cfg\r\n");

            exec(`${syncconfigPath}syncconfig.sh`, (err, stdout, stderr) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log(stdout);
            });
          }
        );
      });
    }
  });
};
export default {
  vipCreater,
};
