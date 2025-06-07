import { MongoClient } from "mongodb";
import { ButtonBuilder, ActionRowBuilder } from "discord.js";
import options from "../config.js";
const { donationLink } = options;
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
      content: `Скопируйте ваш SteamID: **${steamId}**\nИли просто нажмите кнопку ниже и вставьте его в поле "Комментарий" при оформлении доната.`,
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "Оформить донат",
              url: `${donationLink}?message=${steamId}`,
            },
          ],
        },
      ],
      ephemeral: true,
    });
  } catch (e) {
    console.error(e);
  } finally {
    await clientdb.close();
  }
}

export default donateInteraction;
