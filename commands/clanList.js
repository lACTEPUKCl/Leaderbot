import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import getUsernameFromDB from "../utility/getUsernameFromDB.js";
import { config } from "dotenv";
config();

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
    const adminsCfgPath = process.env.ADMINS_URL;
    const discordID = interaction.user.id;

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
      const clanUsers = {};
      let currentClan = null;
      let clanOwner = null;
      let date = null;
      for (const line of lines) {
        const clanMatch = line.match(/\/\/CLAN \[(.+)] (\d+) do (.+)/);
        if (clanMatch) {
          const clanName = clanMatch[1];
          const clanOwnerTemp = clanMatch[2];
          if (clanOwnerTemp === discordID) {
            clanUsers[clanName] = [];
            currentClan = clanName;
            clanOwner = clanOwnerTemp;
            date = clanMatch[3];
          }
        } else if (line.trim() === "//END") {
          currentClan = null;
        }

        const user = extractUsers(line);
        if (user && currentClan) {
          clanUsers[currentClan].push(user);
        }
      }

      if (clanOwner === discordID) {
        let response = "";
        let messageChunks = [];

        for (const [clanName, users] of Object.entries(clanUsers)) {
          response += `**${clanName} дата окончания VIP: ${date}**:\n`;
          for (const user of users) {
            const userName = await getUsernameFromDB(user.discordID);
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
        }

        if (response) messageChunks.push(response);

        for (const chunk of messageChunks) {
          await interaction.followUp({
            content: chunk || "Нет доступных данных о клане.",
            ephemeral: true,
          });
        }
      } else {
        await interaction.editReply({
          content: "У вас нет прав на просмотр этого списка клана.",
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
