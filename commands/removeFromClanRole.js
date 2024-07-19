import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { config } from "dotenv";
import options from "../config.js";
config();

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
  try {
    const user = interaction.user;
    const userID = user.id;
    const userName = interaction.options.getUser("name");
    const { adminsCfgPath } = options;

    if (!userName) {
      interaction.reply({
        content: "Не удалось найти указанного пользователя.",
        ephemeral: true,
      });
      return;
    }

    fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf8", async (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      const lines = data.split("\n");

      const clanRegex = /^\/\/CLAN \[(.+)] (\d+) do (.+)/;

      lines.forEach((line) => {
        const clanMatch = line.match(clanRegex);

        if (clanMatch) {
          const clanName = clanMatch[1];
          const discordID = clanMatch[2];

          if (discordID === userID) {
            const guild = interaction.guild;
            if (!guild) {
              interaction.reply({
                content: "Ошибка: команда не выполнима вне сервера.",
                ephemeral: true,
              });
              return;
            }

            const member = guild.members.cache.get(userName.id);
            if (!member) {
              interaction.reply({
                content: "Ошибка: указанный пользователь не найден на сервере.",
                ephemeral: true,
              });
              return;
            }

            const role = guild.roles.cache.find(
              (role) => role.name === `[${clanName}]`
            );
            if (role) {
              member.roles.remove(role);
              interaction.reply({
                content: `Роль клана "${clanName}" успешно удалена у пользователя ${userName}`,
                ephemeral: true,
              });
            } else {
              interaction.reply({
                content: `Не удалось найти роль для клана "${clanName}".`,
                ephemeral: true,
              });
            }
          }
        }
      });
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: removeFromClanRoleCommand, execute };
