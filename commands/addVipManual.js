import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import vipCreater from "../utility/vip-creater.js";
import options from "../config.js";

const addVipCommand = new SlashCommandBuilder()
  .setName("addvip")
  .setDescription("Команда для добавления VIP вручную")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
addVipCommand.addStringOption((option) =>
  option
    .setName("steamid64")
    .setDescription("Введите 17 цифр steamID64 для получения статистики игрока")
    .setRequired(true)
    .setMaxLength(17)
    .setMinLength(17)
);
addVipCommand.addStringOption((option) =>
  option
    .setName("discordid")
    .setDescription("Введите discordID игрока")
    .setRequired(true)
);
addVipCommand.addStringOption((option) =>
  option
    .setName("сумма")
    .setDescription("Введите сумму доната")
    .setRequired(true)
);

addVipCommand.addStringOption((option) =>
  option.setName("имя").setDescription("Введите имя игрока").setRequired(true)
);

const execute = async (interaction) => {
  try {
    const steamid64 = interaction.options.getString("steamid64");
    const discordid = interaction.options.getString("discordid");
    const sumString = interaction.options.getString("сумма");
    const name = interaction.options.getString("имя");

    const sum = Number(sumString.replace(",", "."));

    if (!Number.isFinite(sum) || sum <= 0) {
      await interaction.reply({
        content: "Сумма доната должна быть положительным числом.",
        ephemeral: true,
      });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(discordid);

      let vipRole =
        interaction.guild.roles.cache.find(
          (role) => role.name === options.vipRoleName
        ) ||
        (options.vipRoleID &&
          (await interaction.guild.roles.fetch(options.vipRoleID)));

      if (!vipRole) {
        console.warn(
          "[addvip] Не найдена роль VIP по имени/ID, проверь config.js"
        );
      } else {
        await member.roles.add(vipRole);
      }
    } catch (error) {
      console.log("[addvip] Ошибка при выдаче роли VIP:", error);
    }

    await vipCreater.vipCreater(steamid64, name, sum, discordid);

    await interaction.reply(
      `Игроку **${name}** (SteamID: \`${steamid64}\`, DiscordID: \`${discordid}\`) был выдан VIP слот и роль (если роль найдена).`
    );
  } catch (error) {
    console.error("[addvip] Ошибка выполнения команды:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: "Произошла ошибка при выполнении команды.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "Произошла ошибка при выполнении команды.",
        ephemeral: true,
      });
    }
  }
};

export default { data: addVipCommand, execute };
