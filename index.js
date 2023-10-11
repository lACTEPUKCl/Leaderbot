import { Client, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
config();
import cleaner from "./vip-cleaner.js";
import top20StatsMain from "./top20StatsMain.js";
import top20StatsTemp from "./top20StatsTemp.js";
import getDonate from "./getDonate.js";
import dateDonateExpires from "./dateDonateExpires.js";
import getStatsOnDiscord from "./getStatsOnDiscord.js";
import getStatsOnDiscordWithoutSteamID from "./getStatsOnDiscordWithoutSteamID.js";
import getBanFromBattlemetrics from "./getBansFromBattlemertics.js";
import getSteamIDFromMessage from "./getSteamIDFromMessage.js";
import creater from "./vip-creater.js";
import chartInitialization from "./chartInitialization.js";

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Список каналов
  const leaderboadChannelMainId = client.channels.cache.get(
    "1069615679281561600"
  );
  const leaderboadChannelTempId = client.channels.cache.get(
    "1119326545572544562"
  );
  const channelId = client.guilds.cache.get("735515208348598292");
  const donateChannelId = client.channels.cache.get("1073712072220754001");
  const checkDonateChannelId = client.channels.cache.get("1073712072220754001");
  const vipManualyChannel = client.channels.cache.get("1122110171380994178");
  const vipChannelId = client.channels.cache.get("819484295709851649");
  const vipBonusChannelId = client.channels.cache.get("1161743444411175024");
  const statsChannelId = ["1091073082510278748", "1093615841624465498"];
  const bansChannelId = "1115705521119440937";
  const tickRateChannelId = client.channels.cache.get("1137378898762551357");
  const memeChannelId = "1151479560047706162";
  const db = process.env.DATABASE_URL;
  const steamApi = process.env.STEAM_API;
  const donateUrl = process.env.DONATE_URL;
  const adminsUrl = process.env.ADMINS_URL;

  // Обновление двух таблиц лидеров
  setInterval(() => {
    top20StatsMain(leaderboadChannelMainId, db);
    top20StatsTemp(leaderboadChannelTempId, db);
    chartInitialization(tickRateChannelId);
  }, 600000);

  // Очистка Vip пользователей, удаление ролей + отправка им уведомлений
  cleaner.vipCleaner((ids) =>
    ids.forEach(async (element) => {
      let role =
        channelId.roles.cache.find((r) => r.name === "VIP") ||
        (await channelId.roles.fetch("1072902141666136125"));
      let getUserList = await channelId.members
        .fetch({ cache: true })
        .catch(console.error);
      let findUser = getUserList.find((r) => r.user.id === element);
      if (!findUser) return;
      findUser
        .send(
          "Ваш Vip статус на сервере RNS закончился, для продления вип статуса перейдите по ссылке https://discord.com/channels/735515208348598292/983671106680528897"
        )
        .catch((error) => {
          console.log("Невозможно отправить сообщение пользователю");
        });
      findUser.roles.remove(role);
    })
  );

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const user = message.guild.members.cache.get(message.author.id);
    const vipRole = message.guild.roles.cache.get("1072902141666136125");

    // Канал для вывода списка донатов
    if (message.channelId === checkDonateChannelId.id)
      await getDonate(process.env.DONATE_URL, donateChannelId);

    // Канал для выдачи Vip слота вручную
    if (message.channelId === vipManualyChannel.id) {
      const msg = message.content.split(" ");
      const [steamID64, discordId, name, sum] = [
        msg[0].match(/[0-9]{17}/),
        msg[1].match(/[0-9]+/),
        msg[2],
        msg[3].match(/[0-9]+/),
      ];

      if (msg.length != 4 || sum[0].length > 4) {
        message.delete();
        return;
      }
      message.react("👍");
      creater.vipCreater(steamID64[0], name, sum[0], discordId[0]);
    }

    // Канал для автовыдачи Vip слота за бонусы
    if (message.channelId === vipBonusChannelId.id) {
      await getSteamIDFromMessage(
        true,
        db,
        message,
        steamApi,
        donateUrl,
        vipRole,
        user,
        (result) => {}
      );
    }

    // Канал для автовыдачи Vip слота
    if (message.channelId === vipChannelId.id) {
      console.log(
        `Получен запрос на получение Vip слота от игрока ${message.author.username}`
      );

      client.users.fetch("132225869698564096", false).then((user) => {
        user.send(`${message.author.username}\n${message.content}`);
      }); //Отправляет уведомление в лс меламори

      await getSteamIDFromMessage(
        false,
        db,
        message,
        steamApi,
        donateUrl,
        vipRole,
        user,
        (result) => {}
      );
    }

    // Команды для вывода !vip - даты окончания Vip, !stats - статистики игрока
    if (statsChannelId.includes(message.channelId)) {
      if (message.content.toLowerCase().includes("!vip")) {
        await dateDonateExpires(message.author.id, adminsUrl, message);
        return;
      }

      if (message.content.toLowerCase().includes("!stats")) {
        const contentParts = message.content.split(" ");
        if (contentParts.length > 1) {
          await getStatsOnDiscord(db, contentParts[1], message, steamApi);
        } else {
          await getStatsOnDiscordWithoutSteamID(
            db,
            adminsUrl,
            message,
            steamApi
          );
        }
        return;
      }

      message.delete();
    }

    if (bansChannelId.includes(message.channelId)) {
      getBanFromBattlemetrics(message);
    }

    if (memeChannelId.includes(message.channelId)) {
      if (message.attachments.size > 0) {
        const isImage = message.attachments.every(
          (attachment) =>
            /\.(jpg|jpeg|png|gif)$/.test(attachment.url) ||
            /\.(jpg|jpeg|png|gif)(\?.*)?$/.test(attachment.url)
        );

        if (!isImage) {
          message.delete();
        }
      } else if (
        !/\.(jpg|jpeg|png|gif)$/.test(message.content) &&
        !/\.(jpg|jpeg|png|gif)(\?.*)?$/.test(message.content)
      ) {
        message.delete();
      }
    }
  });
});
client.login(process.env.CLIENT_TOKEN);
