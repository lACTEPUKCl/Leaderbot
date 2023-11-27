import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { MongoClient } from "mongodb";
import updateAdmins from "../utility/updateAdmins.js";
import { config } from "dotenv";
config();

const db = process.env.DATABASE_URL;
const allowedChannelId = process.env.ADMINACTIVITY_CHANNELID;

const delAdminCommand = new SlashCommandBuilder()
  .setName("deladmin")
  .setDescription("Удалить администратора")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
delAdminCommand.addUserOption((option) =>
  option
    .setName("name")
    .setDescription("Напишите имя администратора в дискорде")
    .setRequired(true)
);
const execute = async (interaction) => {
  try {
    const channelId = interaction.channelId;
    if (!channelId.includes(allowedChannelId)) {
      return await interaction.reply({
        content:
          "Команда доступна только администраторам в канале 'Активность админов'",
        ephemeral: true,
      });
    }
    const user = interaction.options.getUser("name");
    const nickname = user.globalName ? user.globalName : user.username;
    const discordID = user.id;

    const client = new MongoClient(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const database = client.db("SquadJS");
    const collection = database.collection("discordadmins");
    const existingData = await collection.findOne({
      _id: discordID,
    });

    if (existingData) {
      await collection.deleteOne({
        _id: discordID,
      });
      await updateAdmins(interaction);
      await interaction.reply({
        content: `Администратор ${nickname} успешно удален из базы данных.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Администратор ${nickname} не найден ва безе данных.`,
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

export default { data: delAdminCommand, execute };
