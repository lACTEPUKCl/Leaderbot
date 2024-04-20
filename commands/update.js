import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import updateAdmins from "../utility/updateAdmins.js";
import getLastActivity from "../utility/getLastActivity.js";

const updateCommand = new SlashCommandBuilder()
  .setName("update")
  .setDescription("Обновить список активности")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const execute = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  await getLastActivity();
  try {
    await updateAdmins(interaction);
    await interaction.editReply({
      content: `Список активности обновлен.`,
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: updateCommand, execute };
