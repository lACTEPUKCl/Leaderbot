import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { config } from "dotenv";
import { exec } from "child_process";
config();

const allowedChannelId = process.env.RESTART_CHANNELID;
const parolikrisu = process.env.PAROLIKRISU;

const restartCommand = new SlashCommandBuilder()
  .setName("updateserver")
  .setDescription("Обновить сервер")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
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
      { id: "server5", label: "Сервер 4" },
    ];

    const buttons = servers.map((server) =>
      new ButtonBuilder()
        .setCustomId(server.id)
        .setLabel(server.label)
        .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(...buttons);

    await interaction.reply({
      content: "Выберите сервер, который вы хотите обновить?",
      components: [row],
      ephemeral: true,
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
  const { customId } = interaction;
  let shellScriptName;
  const serverNumber = customId.replace("server", "");

  try {
    await interaction.message.delete();

    exec(
      `echo ${parolikrisu} | sudo -S systemctl stop squad-${serverNumber}.service`,
      (error, stderr) => {
        if (error) {
          console.error(`Ошибка: ${error}`);
          return;
        }

        if (stderr) {
          console.error(`Ошибка при отключении сервера: ${stderr}`);
          return;
        }

        interaction.editReply({
          content: `Сервер ${serverNumber} отключен для установки обновления!`,
          ephemeral: true,
        });

        if (serverNumber === "server1") shellScriptName = "startserver1";
        if (serverNumber === "server2") shellScriptName = "startserver2";
        if (serverNumber === "server3") shellScriptName = "startserver31";
        if (serverNumber === "server5") shellScriptName = "startserver5_VMOD";

        exec(
          `/home/kry/UpdateServerScripts/${shellScriptName}.sh`,
          (error, stderr) => {
            if (error) {
              console.error(`Ошибка выполнения скрипта: ${error}`);
              return;
            }
            if (stderr) {
              console.error(`Ошибка в выводе скрипта: ${stderr}`);
              return;
            }

            interaction.editReply({
              content: `Обновление успешно загружено!`,
              ephemeral: true,
            });

            exec(
              "cp -R /home/kry/squad_server5/steamapps/workshop/content/393380/2908652819/SquadV /home/kry/squad_server5/SquadGame/Plugins/Mods/2908652819",
              (error, stderr) => {
                if (error) {
                  console.error(`Ошибка копирования мода: ${error}`);
                  return;
                }
                if (stderr) {
                  console.error(`Ошибка в выводе команды cp: ${stderr}`);
                  return;
                }
                interaction.editReply({
                  content: `Обновление успешно скопированно в папку сервера!`,
                  ephemeral: true,
                });

                exec(
                  `echo ${parolikrisu} | sudo -S systemctl start squad-${serverNumber}.service`,
                  (error) => {
                    if (error) {
                      console.error(`Ошибка: ${error}`);
                    }

                    if (stderr) {
                      console.error(`Ошибка при включении сервера: ${stderr}`);
                      return;
                    }

                    interaction.editReply({
                      content: `Сервер ${serverNumber} успешно обновлен и запущен!`,
                      ephemeral: true,
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Ошибка при обработке взаимодействия:", error);
  }
};

export default { data: restartCommand, execute, buttonInteraction };
