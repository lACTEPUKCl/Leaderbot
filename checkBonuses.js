import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";

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
    const userName = dbUser.name;
    const discordId = message.author.id;
    if (!dbUser) return;
    const changeBonuses = Math.abs(15000 - dbUser.bonuses);
    if (dbUser.bonuses < 15000) {
      console.log(
        `У игрока ${userName} не хватает ${changeBonuses} бонусных баллов`
      );
      await message.reply(
        `Не хватает бонусных баллов для получения Vip статуса, требуется 15000 бонусных баллов`
      );
    } else {
      console.log(
        `Игроку ${dbUser.name} со steamID ${steamId} был выдан Vip статус за бонусные баллы`
      );
      await updateUserBonuses(collection, steamId, -15000);
      await message.reply(`Поздравляем с получением Vip статуса на один месяц`);
      creater.vipCreater(steamId, dbUser.name, 300, discordId);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}

export default checkBonuses;
