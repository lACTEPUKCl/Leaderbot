import fs from "fs";
import { exec } from "node:child_process";
import { config } from "dotenv";
config();
const adminsCfgPath = process.env.ADMINS_URL;
const vipCreater = async (steamID, nickname, time, summ, discordId) => {
  console.log("vipcreated");
  const summPerDay = summ / 9.863;
  const currentTime = new Date().getTime();
  const updatedTIme = new Date(currentTime + summPerDay * 24 * 60 * 60 * 1000);
  const endTime = updatedTIme.toLocaleDateString();
  const reformData = endTime.split("/");
  const newdate = reformData[1] + "/" + reformData[0] + "." + reformData[2];
  console.log(newdate);
  console.log(updatedTIme.toLocaleDateString());
  fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const newData = data.concat(
      `\r\nAdmin=${steamID}:Reserved // DiscordID ${discordId} do ${endTime}`
    );
    if (newData.length) {
      fs.writeFile(`${adminsCfgPath}Admins.cfg`, newData, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`Игрок ${nickname} добавлен`);

        fs.writeFile(`${adminsCfgPath}AdminsBackup.cfg`, data, (err) => {
          if (err) {
            console.error(err);
            return;
          }

          console.log(
            "\x1b[33m",
            "\r\n Создан бэкап файла AdminsBackup.cfg\r\n"
          );

          // exec("../syncconfig.sh", (err, stdout, stderr) => {
          //   if (err) {
          //     console.error(err);
          //     return;
          //   }
          //   console.log(stdout);
          // });
        });
      });
    }
  });
};
export default {
  vipCreater,
};
