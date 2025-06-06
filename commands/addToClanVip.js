import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { exec } from "child_process";
import options from "../config.js";

const addToClanVipCommand = new SlashCommandBuilder()
  .setName("addtoclanvip")
  .setDescription("Добавить игрока в клан")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads);

addToClanVipCommand.addStringOption((option) =>
  option
    .setName("steamid64")
    .setDescription("Введите 17 цифр steamID64 для получения статистики игрока")
    .setRequired(true)
    .setMaxLength(17)
    .setMinLength(17)
);

addToClanVipCommand.addUserOption((option) =>
  option.setName("name").setDescription("Напишите имя игрока в дискорде")
);

const {
  adminsCfgPath,
  maxClanVipUsers,
  syncconfigPath,
  vipRoleName,
  adminsCfgBackups,
} = options;

function extractUsers(line) {
  const match = line.match(/Admin=(\d+):ClanVip \/\/ DiscordID (\d+) do (.+)/);
  if (match) {
    return { steamId: match[1], discordID: match[2] };
  }
  return null;
}

const execute = async (interaction) => {
  try {
    const user = interaction.options.getUser("name");
    const steamID64 = interaction.options.getString("steamid64");
    const discordID = interaction.user.id;
    const discordIDuser = user ? user.id : "666";
    const member = await interaction.guild.members.fetch(discordID);
    const clanRole = member.roles.cache.find((role) =>
      /^\[.+\]$/.test(role.name)
    );
    if (!clanRole) {
      await interaction.reply({
        content:
          "У вас нет клановой роли! Название роли должно быть вида [CLAN].",
        ephemeral: true,
      });
      return;
    }

    const clanNameMatch = clanRole.name.match(/^\[(.+)\]$/);
    if (!clanNameMatch) {
      await interaction.reply({
        content: "Ошибка: не удалось определить название клана из вашей роли!",
        ephemeral: true,
      });
      return;
    }
    const userClan = clanNameMatch[1];

    fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf8", async (err, data) => {
      if (err) {
        console.error("Ошибка чтения файла:", err);
        return;
      }

      const lines = data.split("\n");
      let clanUsers = {};
      let currentClanTemp = null;
      let currentClan = null;
      let updatedLines = [];
      let isInClanBlock = false;
      let clanBlockEndIndex = null;
      let expireDate;

      lines.forEach((line, index) => {
        const clanMatch = line.match(/\/\/CLAN \[(.+)] (\d+) do (.+)/);
        if (clanMatch) {
          const fileClan = clanMatch[1];
          if (fileClan === userClan) {
            currentClanTemp = fileClan;
            currentClan = fileClan;
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

      if (!currentClan) {
        await interaction.reply({
          content: `Не найден блок для вашего клана [${userClan}] в конфиге.`,
          ephemeral: true,
        });
        return;
      }

      if (clanUsers[currentClan]?.length + 1 > maxClanVipUsers) {
        await interaction.reply({
          content: `Невозможно добавить игрока. Максимум ${maxClanVipUsers} VIP-ов в клане.`,
          ephemeral: true,
        });
        return;
      }

      updatedLines.splice(
        clanBlockEndIndex,
        0,
        `Admin=${steamID64}:ClanVip // DiscordID ${discordIDuser} do ${expireDate}`
      );
      console.log(
        `Пользователь:${steamID64} DiscordID:${discordIDuser} добавлен кланменеджером: ${interaction.user.globalName}`
      );

      const targetGuildMember =
        discordIDuser !== "666"
          ? await interaction.guild.members.fetch(discordIDuser)
          : null;
      const nickname = targetGuildMember
        ? targetGuildMember.nickname || targetGuildMember.user.username
        : "Никнейм не установлен";

      if (targetGuildMember) {
        const clanRoleDiscord = interaction.guild.roles.cache.find(
          (role) => role.name === `[${currentClan}]`
        );
        const vipRole = interaction.guild.roles.cache.find(
          (role) => role.name === vipRoleName
        );
        if (clanRoleDiscord) await targetGuildMember.roles.add(clanRoleDiscord);
        if (vipRole) await targetGuildMember.roles.add(vipRole);
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
      await fs.promises.writeFile(
        `${adminsCfgBackups}/AdminsBackup_${formattedDate}.cfg`,
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
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: addToClanVipCommand, execute };
