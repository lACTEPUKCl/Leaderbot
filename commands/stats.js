import { SlashCommandBuilder } from "discord.js";
import getStatsOnDiscord from "../utility/getStatsOnDiscord.js";
import getStatsOnDiscordWithoutSteamID from "../utility/getStatsOnDiscordWithoutSteamID.js";
import { config } from "dotenv";
config();
const db = process.env.DATABASE_URL;
const adminsUrl = process.env.ADMINS_URL;
const steamApi = process.env.STEAM_API;
const allowedChannelId = process.env.STATS_CHANNELID;
const allowedChannelId2 = process.env.STATS_CHANNELID2;
const statsCommand = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Получить статистику игрока");

statsCommand.addStringOption((option) =>
  option
    .setName("steamid64")
    .setDescription("Введите 17 цифр steamID64 для получения статистики игрока")
    .setRequired(false)
    .setMaxLength(17)
    .setMinLength(17)
);

const execute = async (interaction) => {
  try {
    await interaction.deferReply();
    const userParam = interaction.options.getString("steamid64");

    const channelId = interaction.channelId;

    if (channelId !== allowedChannelId || channelId !== allowedChannelId2) {
      return await interaction.reply({
        content:
          "Команда доступна только VIP пользователям в канале 'Статистика'",
        ephemeral: true,
      });
    }
    if (userParam) {
      await getStatsOnDiscord(db, userParam, interaction, steamApi);
    } else {
      await getStatsOnDiscordWithoutSteamID(
        db,
        adminsUrl,
        interaction,
        steamApi
      );
    }
  } catch (error) {
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: statsCommand, execute };
