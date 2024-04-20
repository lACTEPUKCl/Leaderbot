import fs from "fs";
import getStatsOnDiscord from "./getStatsOnDiscord.js";

async function getStatsOnDiscordWithoutSteamID(
  db,
  adminUrl,
  interaction,
  steamApi
) {
  let steamId = [];
  const regexpAdmin =
    /^Admin=[0-9]*:Reserved [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;
  const regexpClanVip =
    /^Admin=[0-9]*:ClanVip [//]* DiscordID [0-9]* do [0-9]{2}\.[0-9]{2}\.[0-9]{4}/gm;

  fs.readFile(`${adminUrl}Admins.cfg`, "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    data.split("\r\n").some((e) => {
      const userReserved = e.match(regexpAdmin);
      const userClanVip = e.match(regexpClanVip);

      if (userReserved || userClanVip) {
        const getUserReserved = userReserved
          ? userReserved.filter((el) => el.includes(interaction.user.id))
          : [];
        const getUserClanVip = userClanVip
          ? userClanVip.filter((el) => el.includes(interaction.user.id))
          : [];

        if (getUserReserved.length > 0 || getUserClanVip.length > 0) {
          steamId.push(
            getUserReserved.toString().match(/[0-9]{17}/) ||
              getUserClanVip.toString().match(/[0-9]{17}/)
          );
          return true;
        }
      }
    });

    getStatsOnDiscord(db, steamId.toString(), interaction, steamApi);
  });
}

export default getStatsOnDiscordWithoutSteamID;
