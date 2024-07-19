import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import path from "path";
import options from "../config.js";

const removeFromClanRoleCommand = new SlashCommandBuilder()
  .setName("removefromclanrole")
  .setDescription("Удалить у пользователя клановую роль")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads)
  .addUserOption((option) =>
    option
      .setName("name")
      .setDescription("Напишите имя игрока в дискорде")
      .setRequired(true)
  );

const execute = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  try {
    const userName = interaction.options.getUser("name");
    const { adminsCfgPath } = options;

    if (!userName) {
      interaction.editReply({
        content: "Не удалось найти указанного пользователя.",
        ephemeral: true,
      });
      return;
    }

    const filePath = path.join(adminsCfgPath, "Admins.cfg");

    fs.readFile(filePath, "utf8", async (err, data) => {
      if (err) {
        console.error(err);
        interaction.editReply({
          content: "Ошибка при чтении файла конфигурации.",
          ephemeral: true,
        });
        return;
      }

      const lines = data.split("\n");
      const clanRegex = /^\/\/CLAN \[(.+)] (\d+) do (.+)/;

      let roleFound = false;

      for (const line of lines) {
        const clanMatch = line.match(clanRegex);

        if (clanMatch) {
          const clanName = clanMatch[1];
          const discordID = clanMatch[2];

          // Сравниваем ID пользователя из команды с ID в файле
          if (discordID === userName.id) {
            roleFound = true;
            const guild = interaction.guild;
            if (!guild) {
              interaction.editReply({
                content: "Ошибка: команда не выполнима вне сервера.",
                ephemeral: true,
              });
              return;
            }

            const member = guild.members.cache.get(userName.id);
            if (!member) {
              interaction.editReply({
                content: "Ошибка: указанный пользователь не найден на сервере.",
                ephemeral: true,
              });
              return;
            }

            const role = guild.roles.cache.find(
              (role) => role.name === `[${clanName}]`
            );
            if (role) {
              await member.roles.remove(role);
              interaction.editReply({
                content: `Роль клана "${clanName}" успешно удалена у пользователя ${userName}.`,
                ephemeral: true,
              });
            } else {
              interaction.editReply({
                content: `Не удалось найти роль для клана "${clanName}".`,
                ephemeral: true,
              });
            }
            break;
          }
        }
      }

      if (!roleFound) {
        interaction.editReply({
          content: "Указанный пользователь не состоит ни в одном клане.",
          ephemeral: true,
        });
      }
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: removeFromClanRoleCommand, execute };
