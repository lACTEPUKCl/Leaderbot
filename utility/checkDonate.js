import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import getSteamId64 from "./getSteamID64.js";
import options from "../config.js";
import getDonationsListFromDB from "./getDonationsList.js";

async function main(guildId, dbLink, steamApi) {
  const { dbName, vipRoleName } = options;
  const clientdb = new MongoClient(dbLink);

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection("vip");
    const donutsCollection = db.collection("donuts");

    const donations = await getDonationsListFromDB(dbLink);
    for (const jsonEl of donations) {
      const { uid, nickname, message, sum, submit } = jsonEl;

      if (!message || !nickname) continue;

      if (!submit) {
        if (
          !message ||
          (!message.includes("steamcommunity") &&
            !message.match(/\b[0-9]{17}\b/)?.[0])
        )
          continue;

        const steamID = await getSteamId64(steamApi, message);

        if (steamID) {
          const user = await collection.findOne({ steamID: steamID });

          if (!user) continue;

          const discordID = user._id;

          const donutsEl = await donutsCollection.findOne({ _id: uid });

          if (!donutsEl) continue;

          try {
            const discordUser = await guildId.members.fetch(discordID);
            const vipRole = guildId.roles.cache.find(
              (role) => role.name === vipRoleName
            );

            creater.vipCreater(steamID, nickname, sum, discordID);

            await discordUser.roles.add(vipRole);
            await donutsCollection.updateOne(
              { _id: uid },
              { $set: { submit: true } }
            );
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await clientdb.close();
  }
}

export default main;
