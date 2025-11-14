import {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import getStatsOnDiscord from "./getStatsOnDiscord.js";
import { config } from "dotenv";
config();

const DB_NAME = "SquadJS";
const DB_COLLECTION = "mainstats";
const LINK_STEAM_URL = process.env.LINK_STEAM_URL;
const LINK_SIGN_SECRET = process.env.LINK_SIGN_SECRET;

async function getStatsOnDiscordWithoutSteamID(db, interaction, steamApi) {
  const clientdb = new MongoClient(db);
  const discordId = interaction.user.id;

  try {
    await clientdb.connect();
    const database = clientdb.db(DB_NAME);
    const collection = database.collection(DB_COLLECTION);
    const dbUser = await collection.findOne({ discordid: discordId });

    if (!dbUser) {
      if (!LINK_STEAM_URL || !LINK_SIGN_SECRET) {
        console.error(
          "[getStatsOnDiscordWithoutSteamID] Нет LINK_STEAM_URL или LINK_SIGN_SECRET в окружении"
        );
        await interaction.editReply({
          content:
            "Система привязки Steam через сайт сейчас недоступна. Сообщите администратору.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const token = jwt.sign({ discordId }, LINK_SIGN_SECRET, {
        algorithm: "HS256",
        expiresIn: "30m",
      });

      let url = LINK_STEAM_URL;
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}token=${encodeURIComponent(token)}`;

      const confirm = new ButtonBuilder()
        .setLabel("Привязать Steam через сайт")
        .setStyle(ButtonStyle.Link)
        .setURL(url);

      const row = new ActionRowBuilder().addComponents(confirm);

      await interaction.editReply({
        content:
          "Ваш Discord ещё не привязан к Steam.\n" +
          "Нажмите кнопку ниже — откроется сайт, где нужно войти через Steam для привязки.",
        flags: MessageFlags.Ephemeral,
        components: [row],
      });
      return;
    }

    const { _id: steamId } = dbUser;

    if (!steamId) {
      await interaction.editReply({
        content:
          "В базе найден пользователь с вашим Discord, но без SteamID. Обратитесь к администратору.",
        flags: MessageFlags.Ephemeral,
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
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      await interaction.reply({
        content:
          "Произошла ошибка при получении статистики. Пожалуйста, попробуйте позже.",
        flags: MessageFlags.Ephemeral,
      });
    }
  } finally {
    await clientdb.close();
  }
}

export default getStatsOnDiscordWithoutSteamID;
