import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import getUsernameFromDB from "../utility/getUsernameFromDB.js";
import options from "../config.js";

const extractUsers = (line) => {
  const match = line.match(/Admin=(\d+):ClanVip \/\/ DiscordID (\d+) do (.+)/);
  if (match) {
    return { steamId: match[1], discordID: match[2] };
  }
  return null;
};

const clanListCommand = new SlashCommandBuilder()
  .setName("clanlist")
  .setDescription("Получить список VIP в клане")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads);

const execute = async (interaction) => {
  try {
    await interaction.deferReply({ ephemeral: true });
    const { adminsCfgPath } = options;
    const discordID = interaction.user.id;
    const member = await interaction.guild.members.fetch(discordID);
    const clanRole = member.roles.cache.find((role) =>
      /^\[.+\]$/.test(role.name)
    );

    if (!clanRole) {
      await interaction.editReply({
        content:
          "У вас нет клановой роли! Название роли должно быть вида [CLAN].",
        ephemeral: true,
      });
      return;
    }

    const clanNameMatch = clanRole.name.match(/^\[(.+)\]$/);
    if (!clanNameMatch) {
      await interaction.editReply({
        content: "Ошибка: не удалось определить название клана из вашей роли!",
        ephemeral: true,
      });
      return;
    }
    const userClan = clanNameMatch[1];

    fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf8", async (err, data) => {
      if (err) {
        console.error("Ошибка чтения файла:", err);
        await interaction.editReply({
          content: "Произошла ошибка при чтении файла.",
          ephemeral: true,
        });
        return;
      }

      const lines = data.split("\n");
      let collecting = false;
      let date = null;
      let users = [];

      for (const line of lines) {
        const clanMatch = line.match(
          /\/\/CLAN \[(.+)]\s+(\d+)\s+(\d+)\s+do\s+(.+)/
        );
        if (clanMatch) {
          if (clanMatch[1] === userClan) {
            collecting = true;
            date = clanMatch[4];
            continue;
          } else {
            collecting = false;
          }
        }
        if (line.trim() === "//END" && collecting) {
          collecting = false;
        }
        if (collecting) {
          const user = extractUsers(line);
          if (user) users.push(user);
        }
      }

      if (!date) {
        await interaction.editReply({
          content: `Не найден блок для вашего клана [${userClan}] в конфиге.`,
          ephemeral: true,
        });
        return;
      }

      if (!users.length) {
        await interaction.editReply({
          content: "В вашем клане нет VIP-ов.",
          ephemeral: true,
        });
        return;
      }

      let response = `**${userClan} — дата окончания VIP: ${date}**\n`;
      let messageChunks = [];

      for (const user of users) {
        const userName = await getUsernameFromDB(user.steamId);
        const userInfo = `SteamID: **${user.steamId}**, DiscordID: **${user.discordID}**, Имя: **${userName}**\n`;
        if (
          (response + userInfo).length > 2000 ||
          response.split("\n").length >= 16
        ) {
          messageChunks.push(response);
          response = "";
        }
        response += userInfo;
      }

      if (response) messageChunks.push(response);

      await interaction.editReply({
        content: messageChunks.shift(),
        ephemeral: true,
      });
      for (const chunk of messageChunks) {
        await interaction.followUp({
          content: chunk,
          ephemeral: true,
        });
      }
    });
  } catch (error) {
    console.log(error);
    await interaction.editReply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: clanListCommand, execute };
