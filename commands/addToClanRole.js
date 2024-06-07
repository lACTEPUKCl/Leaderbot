import {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} from "discord.js";

const duel = new SlashCommandBuilder()
  .setName("stvol")
  .setDescription("Вызывает на дуэль другого члена сервера");
const execute = async (interaction) => {
  const confirm = new ButtonBuilder()
    .setCustomId(interaction.user.id)
    .setLabel("Принять дуэль")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(confirm);
  await interaction.reply({
    content: `<@${interaction.user.id}> ждёт ответа на дуэль.`,
    components: [row],
  });
};

export default { data: duel, execute };
