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
import getSteamIdModal from "./utility/getSteamIdModal.js";
import getSteamIdFormSubmit from "./utility/getSteamIdFormSubmit.js";
import donateInteraction from "./utility/donateInteraction.js";
import checkDonate from "./utility/checkDonate.js";
import checkVipInteraction from "./utility/checkVipInteraction.js";
import options from "./config.js";
import getSteamId64 from "./utility/getSteamID64.js";
import bonusInteraction from "./utility/bonusInteraction.js";
import getBansFromBattlemetrics from "./utility/getBansFromBattlemetrics.js";
import getDonate from "./utility/getDonate.js";
import top20StatsMain from "./utility/top20StatsMain.js";
import top20StatsTemp from "./utility/top20StatsTemp.js";

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
const userVoiceChannels = new Map();
const interCollections = new Map();

for (const command of commands) {
  if ("data" in command && "execute" in command)
    client.commands.set(command.data.name, command);
  else logger.verbose("discord", 1, `The command missing! in index.js`);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const {
    vipRoleID,
    vipRoleName,
    vipManualChannelId,
    idForNotification,
    discordServerId,

    channelIdToCreateChannel,
    categoryIdForCreateChannel,
    adminsCfgPath,
    bansChannelId,
    memeChannelId,
    donateListChannelID,
    allowedChannelId,
    allowedChannelId2,
    leaderboadChannelIdMain,
    leaderboadChannelIdTemp,
  } = options;

  const guildId = client.guilds.cache.get(discordServerId);
  const db = process.env.DATABASE_URL;
  const steamApi = process.env.STEAM_API;
  const donateChannelId = client.channels.cache.get(donateListChannelID);
  const donateUrl = process.env.DONATE_URL;
  const leaderboadChannelMainId = client.channels.cache.get(
    leaderboadChannelIdMain
  );
  const leaderboadChannelTempId = client.channels.cache.get(
    leaderboadChannelIdTemp
  );

  setInterval(() => {
    checkDonate(guildId, db, steamApi, donateUrl);
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
        guildId.roles.cache.find((r) => r.name === vipRoleName) ||
        (await guildId.roles.fetch(vipRoleID));
      let getUserList = await guildId.members
        .fetch({ cache: true })
        .catch(console.error);
      let findUser = getUserList.find((r) => r.user.id === element);
      if (!findUser) return;
      //findUser.send(vipExpiredMessage).catch((error) => {
      //console.log("Невозможно отправить сообщение пользователю");
      //});
      findUser.roles.remove(role);
    })
  );

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    // Автоудаление сообщений в каналах в которых можно использовать только команды
    const allowedCommandChannels = [
      vipManualChannelId,
      allowedChannelId,
      allowedChannelId2,
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

    if (message.channelId === donateListChannelID)
      await getDonate(process.env.DONATE_URL, donateChannelId);

    if (bansChannelId.includes(message.channelId))
      await getBansFromBattlemetrics(message);

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
      interaction.commandName === "addtoclanvip" ||
      interaction.commandName === "removefromclanvip"
    ) {
      client.users.fetch(idForNotification, false).then((user) => {
        user.send(`${interaction.user.globalName}, ${interaction.commandName}`);
      });
    }
    const command = interaction.client.commands.get(interaction.commandName);

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

          setTimeout(() => {
            try {
              interCollections.delete(interaction.user.id);
            } catch (error) {}
          }, 300000);
        }
        await command.execute(interaction);
      } catch (error) {
        if (interaction.replied || interaction.deferred) {
          console.log(error);
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          console.log(error);
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isButton()) {
      const buttonId = interaction?.customId;

      if (buttonId.includes("duel")) await handleDuelButton(interaction);

      if (buttonId === "SteamID") await getSteamIdModal(interaction);

      if (buttonId === "donatVip") await donateInteraction(interaction, db);

      if (buttonId === "bonusVip") await bonusInteraction(interaction, db);

      if (buttonId === "checkVip")
        await checkVipInteraction(interaction, adminsCfgPath);
    }
  });

  async function muteMember(memberId, guild) {
    try {
      const member = await guild.members.fetch(memberId);
      await member.timeout(600000, "Duel loss");
    } catch (error) {}
  }

  async function handleDuelButton(interaction) {
    if (interCollections.has(interaction.customId.split("_")[1])) {
      try {
        await interCollections
          .get(interaction.customId.split("_")[1])
          .deleteReply();
      } catch (error) {}
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
      `Пуля выпущенная <@${winnerId}> попала <@${loserId}> прямо в сердце.`,
      `Рапира <@${winnerId}> пронзила <@${loserId}> насквозь.`,
      `Стрела выпущенная <@${winnerId}> пронзила грудь <@${loserId}>.`,
      `Сабля <@${winnerId}> разрубила <@${loserId}> на две части.`,
      `<@${loserId}> скрытно пронзили кинжалом в спину.`,
      `<@${winnerId}> ударил по голове <@${loserId}> настолько сильно, что он мгновенно умер.`,
      `<@${loserId}> упал замертво от отравленного дротика выпущенного <@${winnerId}>.`,
      `<@${winnerId}> ударил шпагою и попал в жизненно важный орган <@${loserId}>.`,
      `<@${winnerId}> обезглавил <@${loserId}> одним ударом меча.`,
      `<@${winnerId}> ударил копьем и пробил <@${loserId}> насквозь.`,
      `<@${winnerId}> пронзил сердце <@${loserId}>.`,
      `<@${winnerId}> утопил <@${loserId}> в реке после смертельного удара.`,
      `<@${winnerId}> нанес смертельный удар шипом в шею <@${loserId}>.`,
      `<@${winnerId}> кинул гранату и разорвал <@${loserId}> на куски.`,
      `<@${loserId}> истек кровью после глубокого ранения.`,
      `Сердце <@${loserId}> остановилось от ножевого удара <@${winnerId}>.`,
      `Голову <@${loserId}> пронзила стрела выпущенная <@${winnerId}>.`,
      `Пуля выпущенная <@${winnerId}> пробила череп <@${loserId}>.`,
      `<@${winnerId}> выстрелом пушки разорвал на части <@${loserId}>.`,
      `<@${winnerId}> нанес смертельный удар кинжалом в грудь <@${loserId}>.`,
      `<@${winnerId}> ранил насмерть ядовитым кинжалом <@${loserId}>.`,
      `Стрела выпущенная <@${winnerId}> попала прямо в сердце <@${loserId}>.`,
    ];
    const randomIndex = Math.floor(Math.random() * deathReasons.length);
    const randomString = deathReasons[randomIndex];
    await interaction.reply(randomString);

    await muteMember(loserId, interaction.guild);
  }

  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (
      newState.channelId === channelIdToCreateChannel &&
      !userVoiceChannels.has(newState.channelId)
    ) {
      try {
        const channel = await newState.guild.channels.create({
          name: newState.member.displayName,
          type: 2,
          parent: categoryIdForCreateChannel,
        });
        userVoiceChannels.set(channel.id, channel);

        await newState.setChannel(channel);

        const everyoneRole = newState.guild.roles.everyone;
        await channel.permissionOverwrites.create(everyoneRole, {
          ViewChannel: false,
        });

        const squadRole = newState.guild.roles.cache.find(
          (role) => role.name === "SQUAD"
        );
        if (squadRole) {
          await channel.permissionOverwrites.create(squadRole, {
            ViewChannel: false,
          });
        }

        await channel.permissionOverwrites.create(newState.member, {
          ViewChannel: true,
          AddReactions: true,
          Stream: true,
          SendMessages: true,
          AttachFiles: true,
          Connect: true,
          Speak: true,
        });
      } catch (error) {
        console.error("Error creating channel or setting permissions:", error);
      }
    }

    if (
      oldState.channelId &&
      userVoiceChannels.has(oldState.channelId) &&
      oldState.channel.members.size === 0
    ) {
      try {
        const channel = userVoiceChannels.get(oldState.channelId);
        await channel.delete();
        userVoiceChannels.delete(oldState.channelId);
      } catch (error) {
        console.error("Error deleting channel:", error);
      }
    }
  });
});

await client.login(process.env.CLIENT_TOKEN);
