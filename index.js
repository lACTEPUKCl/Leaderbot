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
  else console.log(`The command is missing required properties!`);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const {
    discordServerId,
    donateListChannelID,
    seedChannelId,
    seedMessageId,
    vipRoleName,
    vipRoleID,
    dbName,
    dbCollection,
  } = options;
  const guildId = client.guilds.cache.get(discordServerId);
  const db = process.env.DATABASE_URL;
  const steamApi = process.env.STEAM_API;
  const seedChannel = await client.channels.fetch(seedChannelId);
  await seedChannel.messages.fetch(seedMessageId);

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
      //findUser.send(vipExpiredMessage).catch((error) => {
      //console.log("Невозможно отправить сообщение пользователю");
      //});
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

  client.on("messageCreate", (message) =>
    handleMessageCreate(message, options, client)
  );

  schedule.scheduleJob("0 7 * * *", async () => {
    await seedingServers(guildId);
  });
await seedingServers(guildId);
  schedule.scheduleJob("0 19 * * *", async () => {
    await endSeeding(guildId);
  });
});

await client.login(process.env.CLIENT_TOKEN);
