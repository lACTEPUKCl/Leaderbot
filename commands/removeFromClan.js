import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { exec } from "child_process";
import { config } from "dotenv";
config();

const removeFromClanCommand = new SlashCommandBuilder()
  .setName("removefromclan")
  .setDescription("Удалить игрока из клана")
  .setDefaultMemberPermissions(PermissionFlagsBits.RequestToSpeak);
removeFromClanCommand.addUserOption((option) =>
  option.setName("name").setDescription("Напишите имя игрока в дискорде")
);
removeFromClanCommand.addStringOption((option) =>
  option
    .setName("steamid64")
    .setDescription("Введите 17 цифр steamID64 игрока")
    .setMaxLength(17)
    .setMinLength(17)
);

const execute = async (interaction) => {
  try {
    const adminsCfgPath = process.env.ADMINS_URL;
    const extractUsers = (line) => {
      const match = line.match(
        /Admin=(\d+):Reserved \/\/ DiscordID (\d+) do (.+)/
      );
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
    lines.forEach((line) => {
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
          foundUser = true;
          return;
        }
      }

      updatedLines.push(line);
    });

    if (!foundUser) {
      await interaction.reply({
        content: `Пользователь ${nickname} не найден в клане.`,
        ephemeral: true,
      });
      return;
    }

    const userIndex = updatedLines.findIndex((line) =>
      line.includes(`Admin=${steamID64}:Reserved // DiscordID ${discordIDuser}`)
    );

    updatedLines.splice(userIndex, 1);

    await fs.promises.writeFile(
      `${adminsCfgPath}Admins.cfg`,
      updatedLines.join("\n")
    );

    await interaction.reply({
      content: `Пользователь ${nickname} успешно удален из клана.`,
      ephemeral: true,
    });

    fs.writeFile(
      `${adminsCfgPath}Backups/AdminsBackup${new Date().toLocaleString(
        "ru-RU",
        {
          timeZone: "Europe/Moscow",
        }
      )}.cfg`,
      updatedLines.join("\n"),
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
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: removeFromClanCommand, execute };
