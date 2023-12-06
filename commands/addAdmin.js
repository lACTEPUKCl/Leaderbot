import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { MongoClient } from "mongodb";
import updateAdmins from "../utility/updateAdmins.js";
import { config } from "dotenv";
config();

const db = process.env.DATABASE_URL;
const allowedChannelId = process.env.ADMINACTIVITY_CHANNELID;

const addAdminCommand = new SlashCommandBuilder()
  .setName("addadmin")
  .setDescription("Выдать предупреждение")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
addAdminCommand.addUserOption((option) =>
  option
    .setName("name")
    .setDescription("Напишите имя администратора в дискорде")
    .setRequired(true)
);
addAdminCommand.addStringOption((option) =>
  option
    .setName("bmuserid")
    .setDescription("Напишите battlemetrics ID администратора")
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
    const BMUserId = interaction.options.getString("bmuserid");
    const discordID = user.id;
    const guildMember = await interaction.guild.members.fetch(discordID);
    const nickname = guildMember
      ? guildMember.nickname || guildMember.user.username
      : "Никнейм не установлен";

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

    if (!existingData) {
      await collection.insertOne({
        _id: discordID,
        name: nickname,
        bmuserid: BMUserId,
        lastseen: new Date(0),
        warn: 0,
        reasons: [],
      });
      await updateAdmins(interaction);
      await interaction.reply({
        content: `Администратор ${nickname} успешно добавлен в базу данных.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Администратор ${nickname} уже существует в базе данных.`,
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

export default { data: addAdminCommand, execute };
