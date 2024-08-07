import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import dateDonateExpires from "../utility/dateDonateExpires.js";
import options from "../config.js";

const { adminsCfgPath, allowedChannelId } = options;

const vipCommand = new SlashCommandBuilder()
  .setName("vip")
  .setDescription("Получить дату окончания VIP статуса")
  .setDefaultMemberPermissions(PermissionFlagsBits.RequestToSpeak);

const execute = async (interaction) => {
  try {
    const channelId = interaction.channelId;
    if (channelId !== allowedChannelId) {
      return await interaction.reply({
        content:
          "Команда доступна только VIP пользователям в канале 'Статистика'",
        ephemeral: true,
      });
    }
    await dateDonateExpires(adminsCfgPath, interaction);
  } catch (error) {
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: vipCommand, execute };
