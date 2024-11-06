import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const removeFromClanRoleCommand = new SlashCommandBuilder()
  .setName("removefromclanrole")
  .setDescription("Удалить у пользователя клановую роль")
  .setDefaultMemberPermissions(PermissionFlagsBits.CreatePrivateThreads)
  .addUserOption((option) =>
    option
      .setName("name")
      .setDescription("Напишите имя игрока в дискорде")
      .setRequired(true)
  );

const execute = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  try {
    const userName = interaction.options.getUser("name");
    const user = interaction.user;
    const guild = interaction.guild;

    if (!guild) {
      interaction.editReply({
        content: "Ошибка: команда не выполнима вне сервера.",
        ephemeral: true,
      });
      return;
    }

    const member = guild.members.cache.get(user.id);
    if (!member) {
      interaction.editReply({
        content: "Ошибка: не удалось найти отправителя команды на сервере.",
        ephemeral: true,
      });
      return;
    }

    const clanRole = member.roles.cache.find((role) =>
      role.name.match(/^\[.*\]$/)
    );
    if (!clanRole) {
      interaction.editReply({
        content: "Не удалось найти клановую роль у отправителя команды.",
        ephemeral: true,
      });
      return;
    }

    const targetMember = guild.members.cache.get(userName.id);
    if (!targetMember) {
      interaction.editReply({
        content: "Ошибка: указанный пользователь не найден на сервере.",
        ephemeral: true,
      });
      return;
    }

    if (targetMember.roles.cache.has(clanRole.id)) {
      await targetMember.roles.remove(clanRole);
      interaction.editReply({
        content: `Роль клана "${clanRole.name}" успешно удалена у пользователя ${userName}.`,
        ephemeral: true,
      });
    } else {
      interaction.editReply({
        content: `Указанный пользователь не имеет роли клана "${clanRole.name}".`,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: removeFromClanRoleCommand, execute };
