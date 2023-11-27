import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { config } from "dotenv";
import { exec } from "child_process"; // Предполагается, что вы используете child_process.exec
config();

const allowedChannelId = process.env.RESTART_CHANNELID;
const restartCommand = new SlashCommandBuilder()
  .setName("restart")
  .setDescription("Перезагрузка плагинов/бота")
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);
const execute = async (interaction) => {
  try {
    const channelId = interaction.channelId;

    if (!channelId.includes(allowedChannelId)) {
      return await interaction.reply({
        content:
          "Команда доступна только админам в канале Рыцари круглого стола'",
        ephemeral: true,
      });
    }

    const servers = [
      { id: "server1", label: "Сервер 1" },
      { id: "server2", label: "Сервер 2" },
      { id: "server3", label: "Сервер 3" },
      { id: "server4", label: "Сервер 4" },
    ];

    const buttons = servers.map((server) =>
      new ButtonBuilder()
        .setCustomId(server.id)
        .setLabel(server.label)
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(...buttons);

    await interaction.reply({
      content: "Выберите сервер бота, который вы хотите перезагрузить?",
      components: [row],
    });
  } catch (error) {
    console.error("Ошибка при выполнении команды:", error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

const buttonInteraction = async (interaction) => {
  if (!interaction.isButton()) return;

  const userID = interaction.user.id;
  const { customId } = interaction;

  const serverNumber = customId.replace("server", "");

  try {
    await interaction.message.delete();

    exec(`pm2 restart SERVER${serverNumber}`, (error) => {
      if (error) {
        console.error(`Ошибка: ${error}`);
      }
    });

    await interaction.channel.send({
      content: `<@${userID}> Бот #${serverNumber} RNS перезагружен!`,
    });

    console.log(`<@${userID}> Бот #${serverNumber} RNS перезагружен!`);
  } catch (error) {
    console.error("Ошибка при обработке взаимодействия:", error);
  }
};

export default { data: restartCommand, execute, buttonInteraction };
