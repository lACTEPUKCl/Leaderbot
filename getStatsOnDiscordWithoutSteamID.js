import fs from "fs";
import getStatsOnDiscord from "./getStatsOnDiscord.js";

function getStatsOnDiscordWithoutSteamID(db, adminUrl, message) {
  const currentUser = [];
  const steamId = [];
  const regexp =
    /^Admin=[0-9]*:Reserved [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;
  fs.readFile(`${adminUrl}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    data.split("\r\n").map((e) => {
      const user = e.match(regexp);
      if (user) {
        if (user.toString().includes(message.author.id)) {
          currentUser.push(user);
          steamId.push(currentUser[0].toString().match(/[0-9]{17}/)[0]);
          getStatsOnDiscord(db, steamId.toString(), message);
          return;
        }
      }
    });
  });
}
export default getStatsOnDiscordWithoutSteamID;
