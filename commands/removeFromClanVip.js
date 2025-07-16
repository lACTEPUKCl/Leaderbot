import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import { exec } from "child_process";
import options from "../config.js";

const { vipRoleName, adminsCfgPath, syncconfigPath, adminsCfgBackups } =
  options;

function extractUsers(line) {
  const m = line.match(/Admin=(\d+):ClanVip \/\/ DiscordID (\d+) do (.+)/);
  if (m) return { steamId: m[1], discordID: m[2] };
  return null;
}

const removeFromClanVipCommand = new SlashCommandBuilder()
  .setName("removefromclanvip")
  .setDescription("Удалить игрока из клана")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads)
  .addUserOption((opt) =>
    opt.setName("name").setDescription("Напишите имя игрока в дискорде")
  )
  .addStringOption((opt) =>
    opt
      .setName("steamid64")
      .setDescription("Введите 17 цифр steamID64 игрока")
      .setMinLength(17)
      .setMaxLength(17)
  );

export default {
  data: removeFromClanVipCommand,
  execute: async (interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const invokerId = interaction.user.id;
      const member = await interaction.guild.members.fetch(invokerId);
      const clanRole = member.roles.cache.find((r) => /^\[.+\]$/.test(r.name));
      if (!clanRole) {
        return interaction.editReply({
          content: "У вас нет клановой роли.",
          ephemeral: true,
        });
      }
      const userClan = clanRole.name.slice(1, -1);

      const targetUser = interaction.options.getUser("name");
      const steamID64 = interaction.options.getString("steamid64");
      const targetId = targetUser?.id || null;
      const guildMember = targetId
        ? await interaction.guild.members.fetch(targetId)
        : null;
      const nickname = guildMember
        ? guildMember.nickname || guildMember.user.username
        : "—";

      const data = await fs.promises.readFile(
        `${adminsCfgPath}Admins.cfg`,
        "utf8"
      );
      const lines = data.split("\n");
      const updated = [];
      let inBlock = false;
      let found = false;

      for (const line of lines) {
        const header = line.match(
          /\/\/CLAN \[(.+)]\s+(\d+)\s+(\d+)\s+do\s+(.+)/
        );
        if (header) {
          inBlock = header[1] === userClan;
          updated.push(line);
          continue;
        }
        if (line.trim() === "//END") {
          if (inBlock) inBlock = false;
          updated.push(line);
          continue;
        }
        if (inBlock) {
          const u = extractUsers(line);
          if (u && (u.steamId === steamID64 || u.discordID === targetId)) {
            found = true;
            continue;
          }
        }
        updated.push(line);
      }

      if (!found) {
        return interaction.editReply({
          content: `Пользователь ${nickname} не найден в клане [${userClan}].`,
          ephemeral: true,
        });
      }

      await fs.promises.writeFile(
        `${adminsCfgPath}Admins.cfg`,
        updated.join("\n")
      );

      if (guildMember) {
        const roleClan = interaction.guild.roles.cache.find(
          (r) => r.name === `[${userClan}]`
        );
        const roleVip = interaction.guild.roles.cache.find(
          (r) => r.name === vipRoleName
        );
        if (roleClan) await guildMember.roles.remove(roleClan);
        if (roleVip) await guildMember.roles.remove(roleVip);
      }

      await interaction.editReply({
        content: `Пользователь ${nickname} успешно удалён из клана [${userClan}].`,
        ephemeral: true,
      });

      const now = new Date();
      const stamp = now
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
        `${adminsCfgBackups}/AdminsBackup_${stamp}.cfg`,
        data
      );
      exec(`${syncconfigPath}syncconfig.sh`);
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "Произошла ошибка.",
        ephemeral: true,
      });
    }
  },
};
