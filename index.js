import { startBackgroundTask } from "./utility/backgroundTask.js";
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
import { createTemporaryVoiceManager } from "./events/handleVoiceState.js";
import { handleInteractionCreate } from "./events/handleInteraction.js";
import { handleMessageCreate } from "./events/handleMessage.js";
import { seedingServers, endSeeding, startSeedingMonitor } from "./utility/seedingServers.js";
import schedule from "node-schedule";
import adminsactivity from "./utility/adminsactivity.js";
import rulesSquad from "./utility/rulesSquad.js";
import clanVipCleaner from "./utility/clanVipCleaner.js";
import "./utility/fonts.js";
import { initLobbyButtons } from "./utility/lobbyButtons.js";
import { registerAntiSpamTimeout } from "./utility/antiSpamTimeout.js";
import { installDiscordTransport } from './utility/discordTransport.js';
import { installInteractionReliability } from './utility/interactionReliability.js';
import { startVipDeliveryRecovery } from './utility/vipDeliveryRecovery.js';
import { safeBotEvent } from './utility/safeBotEvent.js';
import { retryConnection } from './utility/connectionRetry.js';
const discordTransport = installDiscordTransport();

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
  ...discordTransport,
});

installInteractionReliability(client);
client.commands = new Collection();
const commands = await getCommands();
const temporaryVoice = createTemporaryVoiceManager(client, options);
const interCollections = new Map();
registerAntiSpamTimeout(client, options);

for (const command of commands) {
  if ("data" in command && "execute" in command)
    client.commands.set(command.data.name, command);
  else console.log(`The command is missing required properties!`);
}

client.on('error', error => console.error(`[BOT] client error: ${error.code || error.name}`));
client.on('shardError', error => console.error(`[BOT] gateway error: ${error.code || error.name}`));
client.on('voiceStateUpdate', safeBotEvent('voiceStateUpdate', temporaryVoice.handle));
client.on(Events.InteractionCreate, safeBotEvent('interaction', interaction => handleInteractionCreate(
  interaction, client, interCollections, options, process.env.DATABASE_URL,
  process.env.STEAM_API, options.dbName, options.dbCollection, options.seedChannelId
)));

client.once("ready", safeBotEvent("ready", async () => {
  startBackgroundTask("temporaryVoice", async () => {
    temporaryVoice.start();
    await temporaryVoice.sweep();
  }, { stopAfterSuccess: true });
  console.log(`Logged in as ${client.user.tag}!`);
  startBackgroundTask("vipRecovery", () => startVipDeliveryRecovery(), { stopAfterSuccess: true });
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
  startBackgroundTask("seedingMonitor", () => startSeedingMonitor(guildId), { stopAfterSuccess: true });
  const db = process.env.DATABASE_URL;
  const steamApi = process.env.STEAM_API;
  startBackgroundTask("donations", () =>
    checkDonate(guildId, db, steamApi, process.env.DONATE_URL), { intervalMs: 60000 });
  startBackgroundTask("seedMessage", async () => {
    const channel = await client.channels.fetch(seedChannelId);
    await channel.messages.fetch(seedMessageId);
  }, { stopAfterSuccess: true });
  startBackgroundTask("lobbyButtons", () => initLobbyButtons(
    client, process.env.CHANNEL_ID, process.env.STEAM_API, process.env.DOMAIN,
  ), { stopAfterSuccess: true });
  startBackgroundTask("leaderboardMain", () => top20StatsMain(
    client.channels.cache.get(options.leaderboadChannelIdMain), db,
  ), { intervalMs: 600000 });
  startBackgroundTask("leaderboardTemp", () => top20StatsTemp(
    client.channels.cache.get(options.leaderboadChannelIdTemp), db,
  ), { intervalMs: 600000 });
  startBackgroundTask("vipCleaner", () => cleaner.vipCleaner(client), { stopAfterSuccess: true });

  client.on("messageReactionAdd", (reaction, user) =>
    handleReactionAdd(reaction, user),
  );

  client.on("messageReactionRemove", (reaction, user) =>
    handleReactionRemove(reaction, user),
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

  // Отключено 15.08.2026: ежедневный постинг активности админов (спам).
  // Учёт админов переносится в админ-панель сайта. Чтобы вернуть — раскомментировать.
  // schedule.scheduleJob("0 1 * * *", async () => {
  //   await adminsactivity(guildId);
  // });

  schedule.scheduleJob("0 4 * * *", async () => {
    await clanVipCleaner(client.guilds.cache.get(discordServerId));
  });
}));

await retryConnection(() => client.login(process.env.CLIENT_TOKEN), { attempts: Infinity, delay: () => new Promise(resolve => setTimeout(resolve, 5000)) });
