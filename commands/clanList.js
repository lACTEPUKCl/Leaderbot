import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { config } from "dotenv";
config();

const clanListCommand = new SlashCommandBuilder()
  .setName("clanlist")
  .setDescription("Получить список VIP в клане")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads);

const execute = async (interaction) => {
  try {
    const adminsCfgPath = process.env.ADMINS_URL;
    const discordID = interaction.user.id;
    const extractUsers = (line) => {
      const match = line.match(
        /Admin=(\d+):Reserved \/\/ DiscordID (\d+) do (.+)/
      );
      if (match) {
        return { steamId: match[1], discordID: match[2] };
      }
      return null;
    };

    fs.readFile(`${adminsCfgPath}Admins.cfg`, "utf8", async (err, data) => {
      if (err) {
        console.error("Ошибка чтения файла:", err);
        return;
      }

      const lines = data.split("\n");
      const clanUsers = {};
      let currentClan = null;
      let clanOwner = null;
      let date = null;
      lines.forEach((line) => {
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
      });

      if (clanOwner === discordID) {
        let response;
        for (const [clanName, users] of Object.entries(clanUsers)) {
          response = `**${clanName} дата окончания VIP: ${date}**:\n`;
          users.forEach((user, index) => {
            response += `${index + 1}. SteamID: **${
              user.steamId
            }**, DiscordID: **${user.discordID}**\n`;
          });
        }

        await interaction.reply({
          content: response,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "У вас нет прав на просмотр этого списка клана.",
          ephemeral: true,
        });
      }
    });
  } catch (error) {
    console.log(error);
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: clanListCommand, execute };
