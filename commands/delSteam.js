import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { MongoClient } from "mongodb";
import { config } from "dotenv";
config();

const db = process.env.DATABASE_URL;

const delSteam = new SlashCommandBuilder()
  .setName("delsteam")
  .setDescription("Отвязать дискорд от стима игрока")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);
delSteam.addUserOption((option) =>
  option.setName("name").setDescription("Напишите имя игрока").setRequired(true)
);
const execute = async (interaction) => {
  try {
    const user = interaction.options.getUser("name");
    const discordID = user.id;
    const client = new MongoClient(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const database = client.db("SquadJS");
    const collection = database.collection("mainstats");

    const existingData = await collection.findOne({
      discordid: discordID,
    });

    if (existingData) {
      const { _id, name } = existingData;
      await collection.deleteOne({ discordid: discordID });

      await interaction.reply({
        content: `DiscordID игрока ${name} со SteamID:${_id} удален из базы данных`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Discord ID: ${discordID} не найден в базе данных.`,
        ephemeral: true,
      });
    }
    await client.close();
  } catch (error) {
    console.log(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: delSteam, execute };
