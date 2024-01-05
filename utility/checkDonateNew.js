import fetch from "node-fetch";
import fs from "fs/promises";
import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import getSteamId64 from "./getSteamID64.js";

async function main(guildId, db, steamApi) {
  try {
    let response = await fetch(
      "https://donatepay.ru/api/v1/transactions?access_token=FGQ0h6vAsbvDtBn3d0NZTeKvN93D7bDZ33IKlqck52xhpWU6MyZFaEsLMeuG&limit=10&type=donation&status=success"
    );
    const json = await response.json();
    const data = await fs.readFile(`./transactionId.json`);
    const transaction = JSON.parse(data);
    const existingIds = transaction.transactions.map((e) => e.id);
    let discordID;

    for (const jsonEl of json.data) {
      const { id, what, comment, sum } = jsonEl;
      const steamId64 = await getSteamId64(
        steamApi,
        comment,
        async (steamId) => {
          if (steamId) {
            if (!existingIds.includes(id.toString())) {
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
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export default main;
