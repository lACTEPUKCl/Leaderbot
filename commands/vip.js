import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import checkVipInteraction from "../utility/checkVipInteraction.js";
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
    await checkVipInteraction(interaction, adminsCfgPath);
  } catch (error) {
    await (interaction.deferred ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction))({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: vipCommand, execute };
