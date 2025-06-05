import fetch from "node-fetch";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import getSteamId64 from "./getSteamID64.js";
import clanVipManager from "./clanVipManager.js";

async function main(guildId, db, steamApi, donateUrl) {
  try {
    let response = await fetch(donateUrl);
    const json = await response.json();
    const data = await fs.readFile(`./transaction/transactionId.json`);
    const transaction = JSON.parse(data);
    const existingIds = transaction.transactions.map((e) => e.id);
    const allClans = await clanVipManager.parseClansFile();
    const clanTags = allClans.clans.map((c) => c.tag.toLowerCase());

    for (const jsonEl of json.data) {
      const { id, what, comment, sum } = jsonEl;

      if (existingIds.includes(id.toString())) continue;

      const commentTag = comment.trim().toLowerCase();
      if (clanTags.includes(commentTag)) {
        const discordIds = await clanVipManager.updateClan(comment.trim(), 30);
        if (!discordIds.length) {
          console.log(`Клан "${comment.trim()}" не найден или пуст!`);
        }

        for (const discordId of discordIds) {
          try {
            const discordUser = await guildId.members.fetch(discordId);
            const vipRole = guildId.roles.cache.find(
              (role) => role.name === "VIP"
            );
            if (vipRole && discordUser) await discordUser.roles.add(vipRole);
          } catch (error) {
            console.log("Ошибка при выдаче роли клану:", error);
          }
        }
        transaction.transactions.push({
          id: `${id}`,
          username: what,
          clan: commentTag,
        });
        let newData = JSON.stringify(transaction);
        await fs.writeFile(`./transaction/transactionId.json`, newData);
        continue;
      }

      if (
        !comment.includes("steamcommunity") &&
        !comment.match(/\b[0-9]{17}\b/)?.[0]
      )
        continue;
      const steamId = await getSteamId64(steamApi, comment);
      if (steamId) {
        const clientdb = new MongoClient(db);
        const dbName = "SquadJS";
        const dbCollection = "mainstats";
        let discordID;

        try {
          await clientdb.connect();
          const db = clientdb.db(dbName);
          const collection = db.collection(dbCollection);
          const user = await collection.findOne({ _id: steamId });
          if (!user) continue;
          discordID = user.discordid;
        } catch (e) {
          console.error(e);
        } finally {
          await clientdb.close();
        }

        transaction.transactions.push({
          id: `${id}`,
          username: what,
          steamID: steamId,
        });

        if (!discordID) continue;

        try {
          const discordUser = await guildId.members.fetch(discordID);
          const vipRole = guildId.roles.cache.find(
            (role) => role.name === "VIP"
          );
          creater.vipCreater(steamId, what, sum, discordID);
          await discordUser.roles.add(vipRole);
        } catch (error) {
          console.log(error);
        }

        let newData = JSON.stringify(transaction);
        await fs.writeFile(`./transaction/transactionId.json`, newData);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export default main;
