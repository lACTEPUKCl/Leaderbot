import { MongoClient } from "mongodb";
import { ButtonBuilder, ActionRowBuilder } from "discord.js";
import getStatsOnDiscord from "./getStatsOnDiscord.js";

async function getStatsOnDiscordWithoutSteamID(db, interaction, steamApi) {
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
    const dbUser = await collection.findOne({ discordid: discordId });

    if (!dbUser) {
      await interaction.editReply({
        content:
          "Привяжите ваш Steam профиль к дискорд аккаунту при помощи кнопки ниже!",
        ephemeral: true,
        components: [row],
      });
      return;
    }

    const { _id: steamId } = dbUser;

    if (!steamId) {
      await interaction.editReply({
        content:
          "В базе найден пользователь с вашим Discord, но без SteamID. Обратитесь к администратору.",
        ephemeral: true,
      });
      return;
    }

    await getStatsOnDiscord(db, steamId.toString(), interaction, steamApi);
  } catch (error) {
    console.error(
      "Ошибка при получении статистики без SteamID из базы данных:",
      error
    );
    try {
      await interaction.editReply({
        content:
          "Произошла ошибка при получении статистики. Пожалуйста, попробуйте позже.",
        ephemeral: true,
      });
    } catch (_) {
      await interaction.reply({
        content:
          "Произошла ошибка при получении статистики. Пожалуйста, попробуйте позже.",
        ephemeral: true,
      });
    }
  } finally {
    await clientdb.close();
  }
}

export default getStatsOnDiscordWithoutSteamID;
