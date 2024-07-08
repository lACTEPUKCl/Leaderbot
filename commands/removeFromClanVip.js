import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { exec } from "child_process";
import { config } from "dotenv";
config();
import options from "../config.js";

const removeFromClanVipCommand = new SlashCommandBuilder()
  .setName("removefromclanvip")
  .setDescription("Удалить игрока из клана")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads)
  .addUserOption((option) =>
    option.setName("name").setDescription("Напишите имя игрока в дискорде")
  )
  .addStringOption((option) =>
    option
      .setName("steamid64")
      .setDescription("Введите 17 цифр steamID64 игрока")
      .setMaxLength(17)
      .setMinLength(17)
  );

const { vipRoleName, adminsCfgPath, syncconfigPath } = options;

const execute = async (interaction) => {
  try {
    const extractUsers = (line) => {
      const match = line.match(/Admin=(\d+):VIP \/\/ DiscordID (\d+) do (.+)/);
      if (match) {
        return { steamId: match[1], discordID: match[2] };
      }
      return null;
    };

    const user = interaction.options.getUser("name");
    const steamID64 = interaction.options.getString("steamid64");
    const discordID = interaction.user.id;
    const discordIDuser = user ? user.id : null;
    const guildMember = discordIDuser
      ? await interaction.guild.members.fetch(discordIDuser)
      : null;
    const nickname = guildMember
      ? guildMember.nickname || guildMember.user.username
      : "Никнейм не установлен";

    const data = await fs.promises.readFile(
      `${adminsCfgPath}Admins.cfg`,
      "utf8"
    );
    const lines = data.split("\n");
    let clanUsers = {};
    let currentClan = null;
    let clanOwner = null;
    let updatedLines = [];
    let isInClanBlock = false;
    let foundUser = false;
    let expireDate;

    for (const line of lines) {
      const clanMatch = line.match(/\/\/CLAN \[(.+)] (\d+) do (.+)/);
      if (clanMatch) {
        clanOwner = clanMatch[2];
        if (clanOwner === discordID) {
          currentClan = clanMatch[1];
          isInClanBlock = true;
          expireDate = clanMatch[3];
        } else {
          isInClanBlock = false;
        }
      } else if (line.trim() === "//END" && isInClanBlock) {
        currentClan = null;
        isInClanBlock = false;
      }

      const user = extractUsers(line);
      if (user && currentClan) {
        clanUsers[currentClan] = clanUsers[currentClan] || [];
        clanUsers[currentClan].push(user);
        if (user.steamId === steamID64 || user.discordID === discordIDuser) {
          if (guildMember) {
            const clanRole = interaction.guild.roles.cache.find(
              (role) => role.name === `${currentClan}`
            );
            const vipRole = interaction.guild.roles.cache.find(
              (role) => role.name === vipRoleName
            );
            if (clanRole) {
              try {
                await guildMember.roles.remove(clanRole);
              } catch (error) {
                console.error(
                  `Не удалось удалить роль ${currentClan} у пользователя ${nickname}:`,
                  error
                );
                await interaction.reply({
                  content: `Не удалось удалить роль ${currentClan} у пользователя ${nickname}.`,
                  ephemeral: true,
                });
              }
            }
            if (vipRole) {
              try {
                await guildMember.roles.remove(vipRole);
              } catch (error) {
                console.error(
                  `Не удалось удалить VIP роль у пользователя ${nickname}:`,
                  error
                );
                await interaction.reply({
                  content: `Не удалось удалить VIP роль у пользователя ${nickname}.`,
                  ephemeral: true,
                });
              }
            }
          }
          foundUser = true;
          continue;
        }
      }

      updatedLines.push(line);
    }

    if (!foundUser) {
      await interaction.reply({
        content: `Пользователь ${nickname} не найден в клане.`,
        ephemeral: true,
      });
      return;
    }

    await fs.promises.writeFile(
      `${adminsCfgPath}Admins.cfg`,
      updatedLines.join("\n").trim()
    );

    await interaction.reply({
      content: `Пользователь ${nickname} успешно удален из клана.`,
      ephemeral: true,
    });

    const currentDate = new Date();
    const formattedDate = currentDate
      .toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(/(\d+)\.(\d+)\.(\d+), (\d+):(\d+):(\d+)/, "$1.$2.$3_$4.$5.$6");
    console.log(`User ${nickname} removed`, formattedDate);
    await fs.promises.writeFile(
      `${adminsCfgPath}Backups/AdminsBackup_${formattedDate}.cfg`,
      data,
      (err) => {
        if (err) {
          console.error(err);
          return;
        }

        console.log(
          "\x1b[33m",
          `\r\n Backup created AdminsBackup_${formattedDate}.cfg\r\n`
        );
      }
    );
    exec(`${syncconfigPath}syncconfig.sh`);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: removeFromClanVipCommand, execute };
