import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { MongoClient } from "mongodb";
import updateAdmins from "../utility/updateAdmins.js";
import { config } from "dotenv";
config();

const db = process.env.DATABASE_URL;
const allowedChannelId = process.env.ADMINACTIVITY_CHANNELID;

const addStrikeCommand = new SlashCommandBuilder()
  .setName("addstrike")
  .setDescription("Выдать предупреждение")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
addStrikeCommand.addUserOption((option) =>
  option
    .setName("name")
    .setDescription("Напишите имя администратора в дискорде")
    .setRequired(true)
);
addStrikeCommand.addStringOption((option) =>
  option
    .setName("reason")
    .setDescription("Напишите причину вынесения предупреждения")
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
    const reason = interaction.options.getString("reason");
    const discordID = user.id;
    const userInitianor = interaction.member.nickname;
    const client = new MongoClient(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const database = client.db("SquadJS");
    const collection = database.collection("discordadmins");
    const date = new Date();
    const options = {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    };

    const time = new Intl.DateTimeFormat("ru-RU", options).format(date);
    const existingData = await collection.findOne({
      _id: discordID,
    });
    if (existingData) {
      await collection.updateOne(
        { _id: discordID },
        {
          $inc: { warn: 1 },
          $push: { reasons: [time, reason, userInitianor] },
        }
      );
      await updateAdmins(interaction);
      await interaction.reply({
        content: `Данные успешно обновлены для Admin Discord ID: ${discordID}, Warn увеличен на 1, добавлена причина: ${reason}`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Admin Discord ID: ${discordID} не найден в базе данных.`,
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

export default { data: addStrikeCommand, execute };
