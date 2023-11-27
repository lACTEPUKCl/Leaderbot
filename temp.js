import { SlashCommandBuilder } from "discord.js";
import { config } from "dotenv";
config();
const db = process.env.DATABASE_URL;
const adminsUrl = process.env.ADMINS_URL;
const steamApi = process.env.STEAM_API;
const allowedChannelId = process.env.STATS_CHANNELID;
const statsCommand = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Получить статистику игрока");

const execute = async (interaction) => {
  try {
    const channelId = interaction.channelId;

    if (channelId.includes(allowedChannelId)) {
      return await interaction.reply({
        content:
          "Команда доступна только VIP пользователям в канале 'Статистика'",
        ephemeral: true,
      });
    }
  } catch (error) {
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: statsCommand, execute };
