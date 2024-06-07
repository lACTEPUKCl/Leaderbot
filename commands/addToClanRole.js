import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { config } from "dotenv";
config();

const addToClanRoleCommand = new SlashCommandBuilder()
  .setName("addtoclanrole")
  .setDescription("Выдать пользователю клановую роль")
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
    const adminsCfgPath = process.env.ADMINS_URL;
    const userName = interaction.options.getUser("name");

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
              member.roles.add(role);
              interaction.reply({
                content: `Роль клана "${clanName}" успешно выдана пользователю ${userName}`,
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

export default { data: addToClanRoleCommand, execute };
