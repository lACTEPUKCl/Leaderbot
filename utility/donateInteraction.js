import { MongoClient } from "mongodb";
import { ButtonBuilder, ActionRowBuilder } from "discord.js";
async function donateInteraction(interaction, db) {
  const clientdb = new MongoClient(db);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";
  const discordId = interaction.user.id;

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const user = await collection.findOne({ discordid: discordId });
    const confirm = new ButtonBuilder()
      .setCustomId("SteamID")
      .setLabel("Привязать SteamID")
      .setStyle("Success");
    const row = new ActionRowBuilder().addComponents(confirm);

    if (!user) {
      await interaction.reply({
        content: `Привяжите ваш дискорд аккаунт к Steam профилю при помощи кнопки ниже!`,
        ephemeral: true,
        components: [row],
      });
      return;
    }

    const steamId = user._id;
    await interaction.reply({
      content: `Скопируйте ваш SteamID: **${steamId}**\nВставьте его в поле 'Сообщение стримеру' по ссылке https://donatepay.ru/don/rns/`,
      ephemeral: true,
    });
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}

export default donateInteraction;
