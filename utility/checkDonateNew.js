import fetch from "node-fetch";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import getSteamId64 from "./getSteamID64.js";

async function main(guildId, db, steamApi, donateUrl) {
  try {
    let response = await fetch(donateUrl);
    const json = await response.json();
    const data = await fs.readFile(`./transactionId.json`);
    const transaction = JSON.parse(data);
    const existingIds = transaction.transactions.map((e) => e.id);
    let discordID;

    for (const jsonEl of json.data) {
      const { id, what, comment, sum } = jsonEl;
      if (!existingIds.includes(id.toString())) {
        if (
          !comment.includes("steamcommunity") &&
          !comment.match(/\b[0-9]{17}\b/)?.[0]
        )
          return;
        const steamId = await getSteamId64(steamApi, comment);
        if (steamId) {
          const clientdb = new MongoClient(db);
          const dbName = "SquadJS";
          const dbCollection = "mainstats";

          try {
            await clientdb.connect();
            const db = clientdb.db(dbName);
            const collection = db.collection(dbCollection);
            const user = await collection.findOne({ _id: steamId });
            if (!user) return;
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
          if (!discordID) return;

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

          discordUser
            .send(
              "Ваш Vip статус успешно получен, активация на серверах произойдет после смены карты, при наличии проблем создайте тикет в https://discord.com/channels/735515208348598292/1068565169694851182"
            )
            .catch((error) => {
              console.log("Невозможно отправить сообщение пользователю");
            });

          // message.channel.send({
          //   content: `Игроку <@${message.author.id}> - выдан VIP статус, спасибо за поддержку!`,
          // });

          let newData = JSON.stringify(transaction);
          fs.writeFile(`./transactionId.json`, newData, (err) => {
            if (err) return;
          });
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export default main;
