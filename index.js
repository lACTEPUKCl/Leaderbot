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
import checkDonate from "./utility/checkDonate.js";
import options from "./config.js";
import top20StatsMain from "./utility/top20StatsMain.js";
import top20StatsTemp from "./utility/top20StatsTemp.js";
import {
  handleReactionAdd,
  handleReactionRemove,
} from "./events/handleReaction.js";
import { handleVoiceStateUpdate } from "./events/handleVoiceState.js";
import { handleInteractionCreate } from "./events/handleInteraction.js";
import { handleMessageCreate } from "./events/handleMessage.js";
import { seedingServers, endSeeding } from "./utility/seedingServers.js";
import schedule from "node-schedule";
import adminsactivity from "./utility/adminsactivity.js";
import rulesSquad from "./utility/rulesSquad.js";
import clanVipCleaner from "./utility/clanVipCleaner.js";
import "./utility/fonts.js";
import { initLobbyButtons } from "./utility/lobbyButtons.js";
import { registerAntiSpamTimeout } from "./utility/antiSpamTimeout.js";

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
registerAntiSpamTimeout(
  client,
  "1214887967060004875",
  "132225869698564096",
  3,
  90 * 1000,
  24 * 60 * 60 * 1000
);

for (const command of commands) {
  if ("data" in command && "execute" in command)
    client.commands.set(command.data.name, command);
  else console.log(`The command is missing required properties!`);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const threadChannelId = client.channels.cache.get("1204124602230374471");
  const vipChannelId = client.channels.cache.get("1189653903738949723");
  const {
    discordServerId,
    donateListChannelID,
    seedChannelId,
    seedMessageId,
    vipRoleName,
    vipRoleID,
    dbName,
    dbCollection,
    vipExpiredMessage,
  } = options;
  const guildId = client.guilds.cache.get(discordServerId);
  const db = process.env.DATABASE_URL;
  const steamApi = process.env.STEAM_API;
  const seedChannel = await client.channels.fetch(seedChannelId);

  await seedChannel.messages.fetch(seedMessageId);

  await initLobbyButtons(
    client,
    process.env.CHANNEL_ID,
    process.env.STEAM_API,
    "rnserver.ru"
  );

  setInterval(() => {
    checkDonate(guildId, db, steamApi, process.env.DONATE_URL);
  }, 60000);

  setInterval(() => {
    top20StatsMain(
      client.channels.cache.get(options.leaderboadChannelIdMain),
      db
    );
    top20StatsTemp(
      client.channels.cache.get(options.leaderboadChannelIdTemp),
      db
    );
  }, 600000);

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
      findUser.send(vipExpiredMessage).catch((error) => {
        console.log("Невозможно отправить сообщение пользователю");
      });
      findUser.roles.remove(role);
    })
  );

  client.on("messageReactionAdd", (reaction, user) =>
    handleReactionAdd(reaction, user)
  );

  client.on("messageReactionRemove", (reaction, user) =>
    handleReactionRemove(reaction, user)
  );

  client.on("voiceStateUpdate", (oldState, newState) =>
    handleVoiceStateUpdate(oldState, newState, userVoiceChannels, options)
  );

  client.on(Events.InteractionCreate, (interaction) =>
    handleInteractionCreate(
      interaction,
      client,
      interCollections,
      options,
      db,
      steamApi,
      dbName,
      dbCollection,
      seedChannelId
    )
  );

  client.on("messageCreate", (message) => {
    // if (message.channelId === "1119060668046389308") {
    //   rulesSquad("vip", vipChannelId);
    // }
    handleMessageCreate(message, options, client);
  });

  schedule.scheduleJob("0 4 * * *", async () => {
    await seedingServers(guildId);
  });

  schedule.scheduleJob("0 19 * * *", async () => {
    await endSeeding(guildId);
  });

  schedule.scheduleJob("0 1 * * *", async () => {
    await adminsactivity(guildId);
  });

  schedule.scheduleJob("0 4 * * *", async () => {
    await clanVipCleaner(client.guilds.cache.get(discordServerId));
  });
});

await client.login(process.env.CLIENT_TOKEN);
