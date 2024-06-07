import {
    SlashCommandBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
  } from "discord.js";
  
  const duel = new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Вызывает на дуэль другого члена сервера");
  const execute = async (interaction) => {
    const confirm = new ButtonBuilder()
      .setCustomId(`duel_${interaction.user.id}`)
      .setLabel("Принять дуэль")
      .setStyle(ButtonStyle.Success);
  
    const row = new ActionRowBuilder().addComponents(confirm);
    await interaction.reply({
      content: `<@${interaction.user.id}> ждёт ответа на дуэль.`,

      components: [row],
    });

    setTimeout(() => {
        interaction.deleteReply().catch();
    }, 5 * 60 * 1000);
  };
  
  export default { data: duel, execute };
