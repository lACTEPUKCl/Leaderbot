import fs from "fs";
import getStatsOnDiscord from "./getStatsOnDiscord.js";

function getStatsOnDiscordWithoutSteamID(db, adminUrl, message) {
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
        const getUser = user.find((el) => el.includes(message.author.id));
        console.log(getUser.match(/[0-9]{17}/));
        steamId.push(getUser.match(/[0-9]{17}/));
        getStatsOnDiscord(db, steamId.toString(), message);
        return;
      }
    });
  });
}
export default getStatsOnDiscordWithoutSteamID;
