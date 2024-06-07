import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import getCommands from "./commands/getCommands.js";
import { config } from "dotenv";
config();
import cleaner from "./utility/vip-cleaner.js";
import top20StatsMain from "./utility/top20StatsMain.js";
import top20StatsTemp from "./utility/top20StatsTemp.js";
import getDonate from "./utility/getDonate.js";
import getBanFromBattlemetrics from "./utility/getBansFromBattlemetrics.js";
//import chartInitialization from "./chartInitialization.js";
import { exec } from "child_process";
import getSteamIdModal from "./utility/getSteamIdModal.js";
import getSteamIdFormSubmit from "./utility/getSteamIdFormSubmit.js";
import donateInteraction from "./utility/donateInteraction.js";
import checkDonateNew from "./utility/checkDonateNew.js";
import bonusInteraction from "./utility/bonusInteraction.js";
import checkVipInteraction from "./utility/checkVipInteraction.js";
// import rulesDiscord from "./utility/rulesDiscord.js";
// import rulesPalWorld from "./utility/rulesPalWorld.js";
import rulesSquad from "./utility/rulesSquad.js";
import getSaSumModal from "./utility/getSaSumModal.js";
import getSteamId64 from "./utility/getSteamID64.js";

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
const commands = await getCommands();
const interCollections = new Map();

for (const command of commands) {
  if ("data" in command && "execute" in command)
    client.commands.set(command.data.name, command);
  else logger.verbose("discord", 1, `The command missing! in index.js`);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Список каналов
  const leaderboadChannelMainId = client.channels.cache.get(
    "1069615679281561600"
  );
  const leaderboadChannelTempId = client.channels.cache.get(
    "1119326545572544562"
  );
  const guildId = client.guilds.cache.get("735515208348598292");
  const donateChannelId = client.channels.cache.get("1073712072220754001");
  const checkDonateChannelId = client.channels.cache.get("1073712072220754001");
  // const threadChannelId = client.channels.cache.get("1204124602230374471");
  const bansChannelId = "1115705521119440937";
  const memeChannelId = "1151479560047706162";
  // const saSummary = client.channels.cache.get("1248006142790209616");
  const saArchive = client.channels.cache.get("1248316669139615776");
  const activitiAdminsChannelId = process.env.ADMINACTIVITY_CHANNELID;
  const vipManualChannelId = process.env.VIP_CHANNELID;
  const statsChannesId1 = process.env.STATS_CHANNELID;
  const statsChannesId2 = process.env.STATS_CHANNELID2;
  const db = process.env.DATABASE_URL;
  const steamApi = process.env.STEAM_API;
  const donateUrl = process.env.DONATE_URL;
  const adminsUrl = process.env.ADMINS_URL;

  //кнопка
  // const imagePath2 = "../image1.png";

  // const attachment2 = new AttachmentBuilder(imagePath2, {
  //   name: "image1.png",
  // });

  // saSummary.send({ files: [attachment2] });
  // setTimeout(async () => {
  //   const embed1 = new EmbedBuilder().setColor("#275318").setDescription(
  //     `Приветствуем всех, кто хочет стать частью нашего дружного сообщества! Русский народный сервер создает клан под названием Squad Academy, чтобы улучшить игровой опыт у новых игроков, стремящихся к развитию своих навыков и достижению новых высот в игре.

  //   Что мы предлагаем:

  //   -Обучение и поддержку от опытных игроков.

  //   -Совместные тренировки и игры.

  //   -Обмен опытом и знаниями.

  //   Мы ищем активных и целеустремленных игроков, готовых работать над собой и развиваться вместе с нами. Если вы хотите стать частью нашей команды, отправьте заявку на вступление в клан. Мы будем рады видеть вас в Squad Academy!

  //   Чтобы вступить в клан нажмите на кнопку ниже и заполните маленькую анкету!`
  //   );

  //   saSummary.send({ embeds: [embed1] });

  //   const saButton = new ButtonBuilder()
  //     .setCustomId("saSum")
  //     .setLabel("Вступить в Squad Academy")
  //     .setStyle("Success");
  //   const saButtonLeave = new ButtonBuilder()
  //     .setCustomId("saSumLeave")
  //     .setLabel("Покинуть Squad Academy")
  //     .setStyle("Danger");

  //   const row = new ActionRowBuilder().addComponents(saButton, saButtonLeave);

  //   await saSummary.send({
  //     components: [row],
  //   });
  // }, 3000);

  //кнопка

  setInterval(() => {
    checkDonateNew(guildId, db, steamApi, donateUrl);
  }, 60000);

  // Обновление двух таблиц лидеров
  setInterval(() => {
    top20StatsMain(leaderboadChannelMainId, db);
    top20StatsTemp(leaderboadChannelTempId, db);
    //chartInitialization(tickRateChannelId);
  }, 600000);

  // Очистка Vip пользователей, удаление ролей + отправка им уведомлений
  cleaner.vipCleaner((ids) =>
    ids.forEach(async (element) => {
      let role =
        guildId.roles.cache.find((r) => r.name === "VIP") ||
        (await guildId.roles.fetch("1072902141666136125"));
      let getUserList = await guildId.members
        .fetch({ cache: true })
        .catch(console.error);
      let findUser = getUserList.find((r) => r.user.id === element);
      if (!findUser) return;
      findUser
        .send(
          "Ваш Vip статус на сервере RNS закончился, для продления вип статуса перейдите по ссылке https://discord.com/channels/735515208348598292/1189653903738949723"
        )
        .catch((error) => {
          console.log("Невозможно отправить сообщение пользователю");
        });
      findUser.roles.remove(role);
    })
  );

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    // if (message.channelId === "1200212158282207293") rulesDiscord(message);
    // if (message.channelId === "1200212107271077930") rulesPalWorld(message);

    // serverlist ("galactic", "vanila", "mee", "squadv")
    // if (message.channelId === "1119060668046389308") {
    //   rulesSquad("galactic", threadChannelId);
    //   rulesSquad("mee", threadChannelId);
    // rulesSquad("squadv", threadChannelId);
    //   rulesSquad("squad", threadChannelId);
    // }

    // if (message.channelId === "1189653903738949723") {
    //   const imagePath1 = "../image1.png";
    //   const imagePath2 = "../image2.png";

    //   const attachment1 = new AttachmentBuilder(imagePath1, {
    //     name: "image1.png",
    //   });
    //   const attachment2 = new AttachmentBuilder(imagePath2, {
    //     name: "image2.png",
    //   });

    //   message.channel.send({ files: [attachment2] });

    //   const embed1 = new EmbedBuilder().setColor("#275318").setDescription(
    //     `⠀⠀В награду за активность на наших игровых серверах, мы поощряем игроков предоставлением **VIP** статуса. Для этого в игре действует система бонусных баллов.
    //       ⠀Каждому игроку начисляется 1 бонусный балл за 1 минуту, проведенную на игровом сервере, на обычной карте и 2 бонусных балла за 1 минуту на seed-карте.
    //       ⠀За каждые __15000 бонусных__ баллов можно активировать **VIP** статус сроком на 1 месяц. Узнать количество начисленных бонусных баллов можно в игре на нашем сервере написав в чат команду \`"!bonus"\`.

    //       ⠀Чтобы активировать **VIP** за бонусные баллы нажмите на кнопку \`"VIP статус за бонусные баллы"\`.

    //       ⠀Пожалуйста, обратите внимание, что **VIP** статус в игре начнет действовать только после смены карты на сервере!`
    //   );

    //    message.channel.send({ embeds: [embed1] });

    //   const cancel = new ButtonBuilder()
    //     .setCustomId("donatVip")
    //     .setLabel("VIP статус за донат")
    //     .setStyle("Success");

    //   const bonus = new ButtonBuilder()
    //     .setCustomId("bonusVip")
    //     .setLabel("VIP статус за бонусные баллы")
    //     .setStyle("Success");

    //   const checkVip = new ButtonBuilder()
    //     .setCustomId("checkVip")
    //     .setLabel("Проверить VIP статус")
    //     .setStyle("Primary");

    //   const row = new ActionRowBuilder().addComponents(cancel, bonus, checkVip);

    //   await message.channel.send({
    //     components: [row],
    //   });
    // }

    // Автоудаление сообщений в каналах в которых можно использовать только команды
    const allowedCommandChannels = [
      activitiAdminsChannelId,
      vipManualChannelId,
      statsChannesId1,
      statsChannesId2,
    ];

    if (allowedCommandChannels.includes(message.channel.id)) {
      if (!message.interaction) {
        try {
          await message.delete();
        } catch (error) {
          console.error("Error deleting message:", error);
        }
      }
    }

    // Канал для вывода списка донатов
    if (message.channelId === checkDonateChannelId.id)
      await getDonate(process.env.DONATE_URL, donateChannelId);

    if (bansChannelId.includes(message.channelId)) {
      getBanFromBattlemetrics(message);
    }

    if (memeChannelId.includes(message.channelId)) {
      if (message.attachments.size > 0) {
        const isImage = message.attachments.every(
          (attachment) =>
            /\.(jpg|jpeg|png|gif|mp4|mov|avi)$/.test(attachment.url) ||
            /\.(jpg|jpeg|png|gif|mp4|mov|avi)(\?.*)?$/.test(attachment.url)
        );

        if (!isImage) {
          message.delete();
        }
      } else if (
        !/\.(jpg|jpeg|png|gif|mp4|mov|avi)$/.test(message.content) &&
        !/\.(jpg|jpeg|png|gif|mp4|mov|avi)(\?.*)?$/.test(message.content)
      ) {
        message.delete();
      }
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (
      interaction.commandName === "addtoclan" ||
      interaction.commandName === "removefromclan"
    ) {
      client.users.fetch("132225869698564096", false).then((user) => {
        user.send(`${interaction.user.globalName}`);
      }); //Отправляет уведомление в лс меламори
    }
    const command = interaction.client.commands.get(interaction.commandName);

    if (interaction.isModalSubmit()) {
      const steamIdField = interaction.fields.fields.get("steamid64input");
      const steamLink = steamIdField?.value;

      if (steamLink) {
        if (interaction.customId === "saModal") {
          handleSaModalSubmit(interaction, steamLink);
        } else if (interaction.customId === "steamidModal") {
          getSteamIdFormSubmit(interaction, steamLink, db, steamApi);
        }
      }
    }

    async function handleSaModalSubmit(interaction, steamLink) {
      const squadTime = interaction.fields.fields.get("squadTime")?.value;
      const squadRules = interaction.fields.fields.get("squadRules")?.value;
      const steamID64 = await getSteamId64(steamApi, steamLink);

      const embed = new EmbedBuilder()
        .setColor("#275318")
        .setTitle("Ссылка на профиль Steam")
        .setURL(steamLink)
        .setDescription(
          `Пользователь: <@${interaction.user.id}>
          Наигранное время в Squad: ${squadTime}
          Ознакомлены с правилами сервера РНС? ${squadRules}
          SteamID64: ${steamID64}`
        );

      await saArchive.send({ embeds: [embed] });

      const discordUser = await guildId.members.fetch(interaction.user.id);
      await updateUserNickname(discordUser);
      await assignSarRole(discordUser);

      await interaction.reply({
        content: "Добро пожаловать в Squad Academy",
        ephemeral: true,
      });
    }

    async function updateUserNickname(discordUser) {
      try {
        const nickname = discordUser.nickname
          ? `[SAr]${discordUser.nickname}`
          : `[SAr]${discordUser.user.globalName}`;
        await discordUser.setNickname(nickname);
      } catch (error) {}
    }

    async function assignSarRole(discordUser) {
      try {
        const sarRole = guildId.roles.cache.find(
          (role) => role.name === "[SAr]"
        );
        if (sarRole) {
          await discordUser.roles.add(sarRole);
        }
      } catch (error) {}
    }

    if (interaction.isChatInputCommand()) {
      try {
        if (interaction.commandName === "duel") {
          if (interCollections.has(interaction.user.id)) {
            await interaction.reply({
              content: "У вас уже есть активная дуэль",
              ephemeral: true,
            });
            return;
          }
          interCollections.set(interaction.user.id, interaction);
        }
        await command.execute(interaction);
      } catch (error) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isButton()) {
      const buttonId = interaction?.customId;

      const discordUser = await guildId.members.fetch(interaction.user.id);

      if (buttonId === "saSum")
        await handleSaSumButton(discordUser, interaction);

      if (buttonId.includes("duel")) await handleDuelButton(interaction);

      if (buttonId === "saSumLeave")
        await handleSaSumLeaveButton(discordUser, interaction);

      if (buttonId === "SteamID") await getSteamIdModal(interaction);

      if (buttonId === "donatVip") await donateInteraction(interaction, db);

      if (buttonId === "bonusVip") await bonusInteraction(interaction, db);

      if (buttonId === "checkVip")
        await checkVipInteraction(interaction, adminsUrl);
    }

    async function handleSaSumButton(discordUser, interaction) {
      const sarRole = guildId.roles.cache.find((role) => role.name === "[SAr]");
      const userRole = discordUser.roles.cache.some(
        (role) => role.id === sarRole.id
      );

      if (userRole) {
        await interaction.reply({
          content: "Вы уже состоите в Squad Academy :c",
          ephemeral: true,
        });
        return;
      }
      await getSaSumModal(interaction);
    }

    async function handleSaSumLeaveButton(discordUser, interaction) {
      const sarRole = guildId.roles.cache.find((role) => role.name === "[SAr]");
      const userRole = discordUser.roles.cache.some(
        (role) => role.id === sarRole.id
      );

      if (!userRole) {
        await interaction.reply({
          content: "Вы не состоите в Squad Academy :c",
          ephemeral: true,
        });
        return;
      }

      try {
        if (discordUser.nickname.includes("[SAr]")) {
          const newNickName = discordUser.nickname.replace("[SAr]", "").trim();
          await discordUser.setNickname(newNickName);
        }
      } catch (error) {}

      try {
        await discordUser.roles.remove(sarRole);
      } catch (error) {}

      await interaction.reply({
        content: "Как жаль, что вы покинули Squad Academy :c",
        ephemeral: true,
      });
    }
  });

  async function handleDuelButton(interaction) {
    if (interCollections.has(interaction.customId.split("_")[1])) {
      interCollections
        .get(interaction.customId.split("_")[1])
        .deleteReply()
        .catch((error) =>
          console.error("Failed to delete the interaction:", error)
        );
      interCollections.delete(interaction.customId.split("_")[1]);
    }
    const user1 = interaction.customId.split("_")[1];
    const user2 = interaction.user.id;

    let loserId;
    let winnerId;
    if (Math.random() < 0.5) {
      loserId = user1;
      winnerId = user2;
    } else {
      loserId = user2;
      winnerId = user1;
    }
    const deathReasons = [
      `Пуля попала <@${loserId}> прямо в сердце.`,
      `Рапира пронзила <@${loserId}> насквозь.`,
      `Стрела пронзила грудь <@${loserId}>.`,
      `Сабля разрубила <@${loserId}> на две части.`,
      `<@${loserId}> пронзили кинжалом в спину.`,
      `<@${loserId}> ударили по голове настолько сильно, что он мгновенно умер.`,
      `<@${loserId}> упал замертво от отравленного дротика.`,
      `Удар шпагою попал в жизненно важный орган <@${loserId}>.`,
      `<@${loserId}> обезглавили одним ударом меча.`,
      `Копье пробило <@${loserId}> насквозь.`,
      `<@${loserId}> захлебнулся собственной кровью после ранения в легкое.`,
      `Меч пронзил сердце <@${loserId}>.`,
      `<@${loserId}> утопили в реке после смертельного удара.`,
      `Яд израненной раной проник в кровь <@${loserId}>.`,
      `Смертельный удар шипом в шею <@${loserId}>.`,
      `Граната разорвала <@${loserId}> на куски.`,
      `<@${loserId}> истек кровью после глубокого ранения.`,
      `Сердце <@${loserId}> остановилось от ножевого удара.`,
      `Голову <@${loserId}> пронзила стрела.`,
      `Пуля пробила череп <@${loserId}>.`,
      `<@${loserId}> разорвала на части пушка.`,
      `Бомба взорвалась прямо у ног <@${loserId}>.`,
      `Смертельный удар кинжалом в грудь <@${loserId}>.`,
      `<@${loserId}> ранили насмерть ядовитым кинжалом.`,
      `Стрела попала прямо в сердце <@${loserId}>.`,
    ];
    const randomIndex = Math.floor(Math.random() * deathReasons.length);
    const randomString = deathReasons[randomIndex];
    await interaction.reply(randomString);
    const member = interaction.guild.members.cache.get(loserId);
    member.timeout(-10_800_000);
  }

  client.on("voiceStateUpdate", async (oldState, newState) => {
    const newUserChannel = newState.channel;
    const oldUserChannel = oldState.channel;
    const channelIdToCreate = "1184077084495204453";
    const categoryId = "1087301137645981747";
    let newChannel;
    // Функция для создания разрешений для ролей
    const createRolePermissions = () => ({
      ViewChannel: true,
      AddReactions: true,
      Stream: true,
      SendMessages: true,
      AttachFiles: true,
      Connect: true,
      Speak: true,
    });

    // Проверяем, если пользователь входит в канал для создания
    if (
      newUserChannel?.id === channelIdToCreate &&
      !oldUserChannel &&
      newUserChannel
    ) {
      const playerName = newState.member.displayName;
      const rolesToAllow = [
        "Генерал",
        "Замполит",
        "Офицер",
        "Сержант",
        "Курсант",
        "Роль",
      ];
      newChannel = await newUserChannel.guild.channels.create({
        name: playerName,
        type: "2",
        parent: categoryId,
      });

      const everyoneRole = newState.guild.roles.everyone;

      // Создаем разрешения для ролей
      const rolePermissions = rolesToAllow.map((roleName) => {
        const role = newState.guild.roles.cache.find(
          (role) => role.name === roleName
        );
        if (role) {
          return newChannel.permissionOverwrites.create(
            role,
            createRolePermissions(role, true)
          );
        } else {
          console.log(`Роль ${roleName} не найдена.`);
          return null;
        }
      });
      const botRole = newState.guild.roles.cache.find(
        (role) => role.name === "Русский Народный Бот"
      );
      const botPermission = newChannel.permissionOverwrites.create(botRole, {
        ViewChannel: true,
        ManageChannels: true,
        MoveMembers: true,
      });

      const memberPermission = newChannel.permissionOverwrites.create(
        newState.member,
        createRolePermissions(newState.member)
      );

      // Создаем разрешения для @everyone
      const everyonePermission = newChannel.permissionOverwrites.create(
        everyoneRole,
        {
          ViewChannel: false,
        }
      );

      // Ждем завершения всех операций по созданию разрешений
      await Promise.all([
        ...rolePermissions,
        memberPermission,
        everyonePermission,
        botPermission,
      ]);

      // Перемещаем пользователя в созданный канал
      try {
        await newState.member.voice.setChannel(newChannel);
      } catch (error) {
        await newChannel.delete();
      }
    }

    // Проверяем, если пользователь покидает любой канал в категории
    if (
      oldUserChannel?.parentId === categoryId &&
      oldUserChannel?.id !== channelIdToCreate
    ) {
      if (oldUserChannel.members.size === 0) {
        await oldUserChannel.delete();
      }
    }
  });
});

await client.login(process.env.CLIENT_TOKEN);
