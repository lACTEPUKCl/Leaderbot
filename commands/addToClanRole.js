import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const addToClanRoleCommand = new SlashCommandBuilder()
  .setName("addtoclanrole")
  .setDescription("Выдать пользователю клановую роль")
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

    const userName = interaction.options.getUser("name");
    const targetMember = guild.members.cache.get(userName.id);
    if (!targetMember) {
      interaction.editReply({
        content: "Ошибка: указанный пользователь не найден на сервере.",
        ephemeral: true,
      });
      return;
    }

    await targetMember.roles.add(clanRole);
    interaction.editReply({
      content: `Роль клана "${clanRole.name}" успешно выдана пользователю ${userName}.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: addToClanRoleCommand, execute };
