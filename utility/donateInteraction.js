import { MongoClient } from "mongodb";
import { ButtonBuilder, ActionRowBuilder } from "discord.js";
import options from "../config.js";

async function donateInteraction(interaction, db) {
  const clientdb = new MongoClient(db);
  const discordID = interaction.user.id;
  const { donationLink, dbName, dbCollection } = options;
  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    let user = await collection.findOne({ _id: discordID });
    const confirm = new ButtonBuilder()
      .setCustomId("SteamID")
      .setLabel("Привязать SteamID")
      .setStyle("Success");
    const row = new ActionRowBuilder().addComponents(confirm);

    if (!user) {
      const newUser = { _id: discordID, steamID: "", userName: "" };
      await collection.insertOne(newUser);
      user = newUser;
      await interaction.reply({
        content: `Привяжите ваш дискорд аккаунт к Steam профилю при помощи кнопки ниже!`,
        ephemeral: true,
        components: [row],
      });
      return;
    }

    if (user && !user.steamID) {
      await interaction.reply({
        content: `Привяжите ваш дискорд аккаунт к Steam профилю при помощи кнопки ниже!`,
        ephemeral: true,
        components: [row],
      });
      return;
    }

    const steamID = user.steamID;
    await interaction.reply({
      content: `Скопируйте ваш SteamID: **${steamID}**\nВставьте его в поле в комментарии к донату по ссылке ${donationLink}`,
      ephemeral: true,
    });
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}

export default donateInteraction;
