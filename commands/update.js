import { SlashCommandBuilder } from "discord.js";
import updateAdmins from "../utility/updateAdmins.js";
import getLastActivity from "./utility/getLastActivity.js";

const updateCommand = new SlashCommandBuilder()
  .setName("update")
  .setDescription("Обновить список активности");

const execute = async (interaction) => {
  await getLastActivity();
  try {
    await updateAdmins(interaction);
    await interaction.reply({
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
