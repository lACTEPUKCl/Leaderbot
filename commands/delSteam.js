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
  await interaction.deferReply({ flags: 64 });
  const client = new MongoClient(db);
  try {
    const user = interaction.options.getUser("name");
    const discordID = user.id;
    await client.connect();
    const database = client.db("SquadJS");
    const collection = database.collection("mainstats");

    const existingData = await collection.findOne({
      discordid: discordID,
    });

    if (existingData) {
      const { _id, name } = existingData;
      const result = await collection.updateOne(
        { discordid: discordID },
        { $unset: { discordid: "" } }
      );

      await interaction.editReply({
        content: `DiscordID игрока ${name} со SteamID:${_id} удален из базы данных`,
        ephemeral: true,
      });
    } else {
      await interaction.editReply({
        content: `Discord ID: ${discordID} не найден в базе данных.`,
        ephemeral: true,
      });
    }
    await client.close();
  } catch (error) {
    console.log(error);
    await interaction.editReply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  } finally { await client.close().catch(() => {}); }
};

export default { data: delSteam, execute };
