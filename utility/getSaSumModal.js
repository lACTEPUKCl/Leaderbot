import {
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
} from "discord.js";

async function getSaSumModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("saModal")
    .setTitle("Заявка на вступление в Squad Academy");

  const steamID = new TextInputBuilder()
    .setCustomId("steamid64input")
    .setLabel("Введите ссылку на Steam профиль")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const squadTime = new TextInputBuilder()
    .setCustomId("squadTime")
    .setLabel("Ваше наигранное время в Squad")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const squadRules = new TextInputBuilder()
    .setCustomId("squadRules")
    .setLabel("Ознакомлены с правилами сервера РНС?")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const steamRow = new ActionRowBuilder().addComponents(steamID);
  const steamRow1 = new ActionRowBuilder().addComponents(squadTime);
  const steamRow2 = new ActionRowBuilder().addComponents(squadRules);

  modal.addComponents(steamRow);
  modal.addComponents(steamRow1);
  modal.addComponents(steamRow2);

  await interaction.showModal(modal);
}

export default getSaSumModal;
