import {
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
} from "discord.js";
import { MongoClient } from "mongodb";

async function getSteamIdModal(interaction, db, dbName, dbCollection) {
  const discordId = interaction.user.id;
  const client = new MongoClient(db);
  try {
    await client.connect();
    const database = client.db(dbName);
    const collection = database.collection(dbCollection);
    const user = await collection.findOne({ discordid: discordId });

    if (user) {
      await interaction.reply({
        content: `Ваш Discord уже привязан к Steam ${user._id} - ${user.name}!`,
        ephemeral: true,
      });
    } else {
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
  } catch (error) {
    console.error("Ошибка при подключении к MongoDB:", error);
    await interaction.reply({
      content:
        "Произошла ошибка при проверке вашего аккаунта. Пожалуйста, попробуйте позже.",
      ephemeral: true,
    });
  } finally {
    await client.close();
  }
}

export default getSteamIdModal;
