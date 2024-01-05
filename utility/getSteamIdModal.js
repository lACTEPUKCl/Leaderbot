import {
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
} from "discord.js";

async function getSteamIdModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("steamidModal")
    .setTitle("Привязать Steam профиль");

  const steamID64Input = new TextInputBuilder()
    .setCustomId("steamid64input")
    .setLabel("Введите ссылку на Steam профиль!")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const steamRow = new ActionRowBuilder().addComponents(steamID64Input);

  modal.addComponents(steamRow);

  await interaction.showModal(modal);
}

export default getSteamIdModal;
