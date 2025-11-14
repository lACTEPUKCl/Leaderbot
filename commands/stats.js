import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import getStatsOnDiscord from "../utility/getStatsOnDiscord.js";
import getStatsOnDiscordWithoutSteamID from "../utility/getStatsOnDiscordWithoutSteamID.js";
import options from "../config.js";

const { adminsCfgPath, allowedChannelId, allowedChannelId2 } = options;
const db = process.env.DATABASE_URL;
const steamApi = process.env.STEAM_API;
const statsCommand = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Получить статистику игрока")
  .setDefaultMemberPermissions(PermissionFlagsBits.RequestToSpeak);

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
    const channelId = interaction.channelId;

    if (channelId !== allowedChannelId && channelId !== allowedChannelId2) {
      return await interaction.reply({
        content:
          "Команда доступна только VIP пользователям в канале 'Статистика'",
        ephemeral: true,
      });
    }
    await interaction.deferReply({ ephemeral: true });
    const userParam = interaction.options.getString("steamid64");
    if (userParam) {
      await getStatsOnDiscord(db, userParam, interaction, steamApi);
    } else {
      await getStatsOnDiscordWithoutSteamID(db, interaction, steamApi);
    }
  } catch (error) {
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: statsCommand, execute };
