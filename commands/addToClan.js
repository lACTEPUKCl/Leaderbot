import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { exec } from "child_process";
import { config } from "dotenv";
config();

const addToClanCommand = new SlashCommandBuilder()
  .setName("addtoclan")
  .setDescription("Добавить игрока в клан")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads);
addToClanCommand.addStringOption((option) =>
  option
    .setName("steamid64")
    .setDescription("Введите 17 цифр steamID64 для получения статистики игрока")
    .setRequired(true)
    .setMaxLength(17)
    .setMinLength(17)
);
addToClanCommand.addUserOption((option) =>
  option.setName("name").setDescription("Напишите имя игрока в дискорде")
);

const execute = async (interaction) => {
  try {
    const adminsCfgPath = process.env.ADMINS_URL;
    const extractUsers = (line) => {
      const match = line.match(
        /Admin=(\d+):ClanVip \/\/ DiscordID (\d+) do (.+)/
      );
      if (match) {
        return { steamId: match[1], discordID: match[2] };
      }
      return null;
    };
    const user = interaction.options.getUser("name");
    const steamID64 = interaction.options.getString("steamid64");
    const discordID = interaction.user.id;
    const discordIDuser = user ? user.id : "666";

    // Проверяем существует ли пользователь с ID 666
    const guildMember =
      discordIDuser !== "666"
        ? await interaction.guild.members.fetch(discordIDuser)
        : null;
    const nickname = guildMember
      ? guildMember.nickname || guildMember.user.username
      : "Никнейм не установлен";

    fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf8", async (err, data) => {
      if (err) {
        console.error("Ошибка чтения файла:", err);
        return;
      }

      const lines = data.split("\n");
      let clanUsers = {};
      let currentClanTemp = null;
      let currentClan = null;
      let clanOwnerTemp = null;
      let clanOwner = null;
      let updatedLines = [];
      let isInClanBlock = false;
      let clanBlockEndIndex = null;
      let expireDate;
      lines.forEach((line, index) => {
        const clanMatch = line.match(/\/\/CLAN \[(.+)] (\d+) do (.+)/);
        if (clanMatch) {
          clanOwnerTemp = clanMatch[2];
          if (clanOwnerTemp === discordID) {
            currentClanTemp = clanMatch[1];
            currentClan = currentClanTemp;
            clanOwner = clanOwnerTemp;
            clanUsers[currentClanTemp] = [];
            isInClanBlock = true;
            expireDate = clanMatch[3];
          } else {
            isInClanBlock = false;
          }
        } else if (line.trim() === "//END" && isInClanBlock) {
          currentClanTemp = null;
          isInClanBlock = false;
          clanBlockEndIndex = index;
        }

        updatedLines.push(line);
        const user = extractUsers(line);
        if (user && currentClanTemp) {
          clanUsers[currentClanTemp].push(user);
        }
      });

      if (clanUsers[currentClan]?.length + 1 > 30) {
        await interaction.reply({
          content: "Невозможно добавить игрока. Максимум 30 VIPов в клане.",
          ephemeral: true,
        });
        return;
      }

      if (clanOwner === discordID) {
        updatedLines.splice(
          clanBlockEndIndex,
          0,
          `Admin=${steamID64}:ClanVip // DiscordID ${discordIDuser} do ${expireDate}`
        );
        console.log(
          `Пользователь:${steamID64} DiscordID:${discordIDuser} добавлен кланменеджером: ${interaction.member.nickname}`
        );

        if (guildMember) {
          const clanRole = interaction.guild.roles.cache.find(
            (role) => role.name === `[${currentClan}]`
          );
          const vipRole = interaction.guild.roles.cache.find(
            (role) => role.name === `VIP`
          );

          await guildMember.roles.add(clanRole);
          await guildMember.roles.add(vipRole);
        }

        fs.writeFile(
          `${adminsCfgPath}Admins.cfg`,
          updatedLines.join("\n").trim(),
          (err) => {
            if (err) {
              console.error("Ошибка записи файла:", err);
              return;
            }
            interaction.reply({
              content: `Пользователь ${nickname} успешно добавлен в клан.`,
              ephemeral: true,
            });
          }
        );

        fs.writeFile(
          `${adminsCfgPath}Backups/AdminsBackup${new Date().toLocaleString(
            "ru-RU",
            {
              timeZone: "Europe/Moscow",
            }
          )}.cfg`,
          updatedLines.join("\n").trim(),
          (err) => {
            if (err) {
              console.error(err);
              return;
            }

            console.log("\x1b[33m", "\r\n Backup created AdminsBackup.cfg\r\n");

            exec("/home/kry/syncconfig.sh", (err, stdout, stderr) => {
              if (err) {
                console.error(err);
                return;
              }
              console.log(stdout);
            });
          }
        );
      } else {
        await interaction.reply({
          content: "У вас нет прав на добавление в клан.",
          ephemeral: true,
        });
      }
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: addToClanCommand, execute };
