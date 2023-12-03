import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { MongoClient } from "mongodb";
import updateAdmins from "../utility/updateAdmins.js";
import { config } from "dotenv";
config();

const db = process.env.DATABASE_URL;
const allowedChannelId = process.env.ADMINACTIVITY_CHANNELID;

const getStrikeCommand = new SlashCommandBuilder()
  .setName("getstrike")
  .setDescription("Получить список предупреждений")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);
getStrikeCommand.addUserOption((option) =>
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

    if (existingData && existingData.reasons.length !== 0) {
      const formattedStrikes = existingData.reasons.map(([date, reason]) => {
        return `Дата: ${date} Причина: ${reason}`;
      });

      const strike = formattedStrikes.join("\n");
      await interaction.reply({
        content: strike,
        ephemeral: true,
      });
    } else if (existingData && existingData.reasons.length === 0) {
      await interaction.reply({
        content: `Предупреждений нет.`,
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

export default { data: getStrikeCommand, execute };
