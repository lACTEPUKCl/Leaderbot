import fetch from "node-fetch";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import getSteamId64 from "./getSteamID64.js";
import clanVipManager from "./clanVipManager.js";

function toLatin(str) {
  const map = {
    а: "a",
    А: "A",
    в: "b",
    В: "B",
    е: "e",
    Е: "E",
    к: "k",
    К: "K",
    м: "m",
    М: "M",
    н: "h",
    Н: "H",
    о: "o",
    О: "O",
    р: "p",
    Р: "P",
    с: "c",
    С: "C",
    т: "t",
    Т: "T",
    у: "y",
    У: "Y",
    х: "x",
    Х: "X",
  };
  return str.replace(/[авекмнорстухАВЕКМНОРСТУХ]/g, (ch) => map[ch] || ch);
}

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

      const rawComment = comment.trim().toLowerCase();
      const transl = toLatin(rawComment);
      const tokens = transl.split(/\s+/);
      const commentTag = tokens.find((tok) => clanTags.includes(tok));

      if (commentTag) {
        const discordIds = await clanVipManager.updateClan(commentTag, 30);
        console.log(discordIds);
        if (!discordIds.length) {
          console.log(`Клан "${comment.trim()}" не найден или пуст!`);
        }
        for (const discordId of discordIds) {
          try {
            const discordUser = await guildId.members.fetch(discordId);
            const vipRole = guildId.roles.cache.find((r) => r.name === "VIP");
            if (vipRole && discordUser) {
              await discordUser.roles.add(vipRole);
            }
          } catch (error) {
            console.log("Ошибка при выдаче роли юзеру:", discordId);
          }
        }
        transaction.transactions.push({
          id: `${id}`,
          username: what,
          clan: commentTag,
        });
        await fs.writeFile(
          `./transaction/transactionId.json`,
          JSON.stringify(transaction, null, 2),
          "utf-8"
        );
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
          if (user) {
            discordID = user.discordid || user.telegramid;
          }
        } catch (e) {
          console.error(e);
        } finally {
          await clientdb.close();
        }

        creater.vipCreater(steamId, what, sum, discordID);

        transaction.transactions.push({
          id: `${id}`,
          username: what,
          steamID: steamId,
        });

        let newData = JSON.stringify(transaction);
        await fs.writeFile(`./transaction/transactionId.json`, newData);

        if (discordID) {
          try {
            const discordUser = await guildId.members.fetch(discordID);
            const vipRole = guildId.roles.cache.find(
              (role) => role.name === "VIP"
            );
            if (vipRole && discordUser) {
              await discordUser.roles.add(vipRole);
            }
          } catch (error) {
            console.log("Ошибка при выдаче роли пользователю:", discordID);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export default main;
