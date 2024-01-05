import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import { ButtonBuilder, ActionRowBuilder } from "discord.js";

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

async function bonusInteraction(interaction, db) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";
  const discordId = interaction.user.id;
  const confirm = new ButtonBuilder()
    .setCustomId("SteamID")
    .setLabel("Привязать SteamID")
    .setStyle("Success");
  const row = new ActionRowBuilder().addComponents(confirm);
  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const dbUser = await collection.findOne({
      discordid: discordId,
    });

    if (!dbUser) {
      await interaction.reply({
        content:
          "Привяжите ваш Steam профиль к дискорд аккаунту при помощи кнопки ниже!",
        ephemeral: true,
        components: [row],
      });
      await clientdb.close();
      return;
    }
    const { bonuses, _id, name } = dbUser;
    if (bonuses < 15000) {
      const changeBonuses = Math.abs(15000 - bonuses);
      await interaction.reply({
        content: `Не хватает ${changeBonuses} бонусных баллов для получения Vip статуса, требуется 15000 бонусных баллов`,
        ephemeral: true,
      });
      await clientdb.close();
      return;
    }

    await updateUserBonuses(collection, _id, -15000);
    await interaction.reply({
      content: `VIP статус успешно получен, можно проверить состояние нажав кнопку выше!`,
      ephemeral: true,
    });

    const user = interaction.guild.members.cache.get(discordId);
    const vipRole = interaction.guild.roles.cache.get("1072902141666136125");
    user.roles.add(vipRole);
    creater.vipCreater(_id, name, 300, discordId);
  } catch (e) {
    console.error(e);
  }
}

export default bonusInteraction;
