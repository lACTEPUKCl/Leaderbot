import { MongoClient } from "mongodb";
import creater from "./vip-creater.js";
import { ButtonBuilder, ActionRowBuilder } from "discord.js";
import options from "../config.js";

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
    const database = clientdb.db(dbName);
    const collection = database.collection(dbCollection);
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
      return;
    }

    const { bonuses, _id, name } = dbUser;

    if (bonuses < 15000) {
      const changeBonuses = Math.abs(15000 - bonuses);
      await interaction.reply({
        content: `Не хватает ${changeBonuses} бонусных баллов для получения VIP статуса, требуется 15000 бонусных баллов`,
        ephemeral: true,
      });
      return;
    }

    await updateUserBonuses(collection, _id, -15000);

    try {
      const member = await interaction.guild.members.fetch(discordId);

      let vipRole =
        interaction.guild.roles.cache.find(
          (r) => r.name === options.vipRoleName
        ) ||
        (options.vipRoleID &&
          (await interaction.guild.roles.fetch(options.vipRoleID)));

      if (vipRole) {
        await member.roles.add(vipRole);
      } else {
        console.warn(
          "[bonusInteraction] Не найдена роль VIP по имени/ID, проверь vipRoleName/vipRoleID в config.js"
        );
      }
    } catch (err) {
      console.log("[bonusInteraction] Ошибка при выдаче роли VIP:", err);
    }

    await creater.vipCreater(_id, name, 300, discordId);

    await interaction.reply({
      content: `VIP статус успешно получен, можно проверить состояние нажав кнопку выше!`,
      ephemeral: true,
    });
  } catch (e) {
    console.error("[bonusInteraction] Ошибка:", e);
    try {
      await interaction.reply({
        content: "Произошла ошибка при попытке выдать VIP статус.",
        ephemeral: true,
      });
    } catch {}
  } finally {
    await clientdb.close().catch(() => {});
  }
}

export default bonusInteraction;
