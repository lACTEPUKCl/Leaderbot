import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import addUser from "./users.js";

async function updateUserBonuses(collection, steamID, count) {
  if (!steamID || !count) return;
  const doc = {
    $inc: {
      bonuses: count,
    },
  };

  const user = {
    _id: steamID,
  };

  await collection.updateOne(user, doc);
}

async function checkBonuses(steamId, message, vipRole, user, dblink) {
  const clientdb = new MongoClient(dblink);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const dbUser = await collection.findOne({
      _id: steamId,
    });
    if (!dbUser) return;
    const userName = dbUser.name;
    const discordId = message.author.id;
    const changeBonuses = Math.abs(15000 - dbUser.bonuses);

    if (dbUser.bonuses < 15000) {
      console.log(
        `У игрока ${userName} не хватает ${changeBonuses} бонусных баллов`
      );
      try {
        await message.author.send(
          `Не хватает бонусных баллов для получения Vip статуса, требуется 15000 бонусных баллов`
        );
      } catch (error) {
        console.log(
          "Невозможно отправить сообщение пользователю",
          message.author.username
        );
      }
      await clientdb.close();

      try {
        message.delete();
      } catch (error) {}

      return;
    }

    await addUser(steamId, message, async (callback) => {
      if (callback) {
        console.log(
          `Игроку ${dbUser.name} со steamID ${steamId} был выдан Vip статус за бонусные баллы`
        );

        await updateUserBonuses(collection, steamId, -15000);

        message.channel.send({
          content: `Игроку <@${message.author.id}> - выдан VIP статус, спасибо за поддержку!`,
        });
        try {
          message.delete();
        } catch (error) {}

        user.roles.add(vipRole);
        creater.vipCreater(steamId, dbUser.name, 300, discordId);
        await clientdb.close();
      } else {
        try {
          message.delete();
        } catch (error) {}
        await clientdb.close();
      }
    });
  } catch (e) {
    console.error(e);
  }
}

export default checkBonuses;
