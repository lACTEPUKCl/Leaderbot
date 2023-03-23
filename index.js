import { Client, GatewayIntentBits } from "discord.js";
import { config } from "dotenv";
config();
import cleaner from "./vip-cleaner.js";
import editEmbed from "./editEmbed.js";
import getDonate from "./getDonate.js";
import checkDonate from "./checkDotane.js";
import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import {
  setIntervalAsync,
  clearIntervalAsync,
} from "set-interval-async/dynamic";
import {
  setTimeout as setTimeoutPromise,
  setInterval,
} from "node:timers/promises";

const firebaseConfig = {
  databaseURL: process.env.DATABASE_URL,
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  const channel = client.channels.cache.get("1069615679281561600");
  const guild = client.guilds.cache.get("735515208348598292");
  const donateChannel = client.channels.cache.get("1073712072220754001");
  let tempSteamId = [];
  // const username = "ACTEPUKC";
  // const discriminator = "9551";
  // const members = await guild.members.fetch();
  // console.log(members);
  // const member = members.find(
  //   (m) =>
  //     m.user.username === username && m.user.discriminator === discriminator
  // );
  // console.log(member.user.id);
  // member.roles.add("1072902141666136125");
  setIntervalAsync(async () => {
    checkDonate(tempSteamId, process.env.DONATE_URL, () => {
      tempSteamId = [];
    });
  }, 30000);

  const getStats = [
    editEmbed({
      channel,
      db,
      sort: "kills",
      messageId: "1069615769610108938",
      authorName: "Топ 20 игроков по убийствам",
      seconds: 1000,
    }),
    editEmbed({
      channel,
      db,
      sort: "death",
      messageId: "1069615861582811178",
      authorName: "Топ 20 игроков по смертям",
      seconds: 3000,
    }),
    editEmbed({
      channel,
      db,
      sort: "revives",
      messageId: "1069615953438048276",
      authorName: "Топ 20 медиков",
      seconds: 4000,
    }),
    editEmbed({
      channel,
      db,
      sort: "teamkills",
      messageId: "1069616004457578627",
      authorName: "Топ 20 тимкилеров",
      seconds: 5000,
    }),
    editEmbed({
      channel,
      db,
      sort: "kd",
      messageId: "1069616217884741693",
      authorName: "Топ 20 игроков по соотношению убийств к смертям",
      seconds: 6000,
    }),
  ];

  async function startEmbedEdit() {
    const interval = 18000000;
    for await (const startTime of setInterval(
      interval,
      Promise.all(getStats)
    )) {
      console.log("Statistics updated");
      Promise.all(getStats);
    }
  }
  startEmbedEdit();

  cleaner.vipCleaner((ids) =>
    ids.forEach((element) => {
      let user = guild.members.cache.get(element);
      guild.members.fetch({ user, cache: true }).then().catch(console.error);
      user?.roles.remove("1072902141666136125");
    })
  );

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channelId === "1073712072220754001")
      getDonate(process.env.DONATE_URL, donateChannel);
    if (message.channelId === "819484295709851649") {
      const content = message.content;
      let steamID64 = content.match(/[0-9]{17}/);
      let steamId = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)\//;
      let groupsId = content.match(steamId)?.groups;

      // if (!steamID64 || !groupsId) {
      //   console.log("false");
      //   client.users.send(
      //     message.author,
      //     "Проверьте правильность ввода steamID64 или ссылки на профиль Steam\nSTEAMID64 можно получить на сайте https://steamid.io/\nSteamid должен быть тот же, что был указан в комментарии доната.\nДискорд для связи на случай затупа: ACTEPUKC#9551"
      //   );
      //   message.delete();
      //   return;
      // }
      if (groupsId) {
        const responseSteam = await fetch(
          `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=78625F21328E996397F2930B25F4C91F&vanityurl=${groupsId.steamId}`
        );
        const dataSteam = await responseSteam.json();
        if (content.split("\n").length != 1) {
          return;
        }
        tempSteamId.push([
          message.author.username,
          message.author.id,
          dataSteam.response.steamid,
          message,
        ]);
      }
      if (steamID64) {
        if (content.split("\n").length != 1) {
          return;
        }
        tempSteamId.push([
          message.author.username,
          message.author.id,
          steamID64.toString(),
          message,
        ]);
      }

      const filter = (reaction, user) => {
        const id = [
          "132225869698564096",
          "365562331121582090",
          "887358770211082250",
          "755025905595842570",
        ];
        const userId = user.id;
        return (
          (["👍"].includes(reaction.emoji.name) && id.includes(userId)) ||
          (["❌"].includes(reaction.emoji.name) && id.includes(userId))
        );
      };
      message
        .awaitReactions({ filter, max: 1, time: 60000, errors: ["time"] })

        .then((collected) => {
          const reaction = collected.first();
          if (typeof reaction == "undefined") return;
          if (reaction.emoji?.name === "❌") return;
          if (reaction.emoji?.name === "👍") {
            let role = message.guild.roles.cache.get("1072902141666136125");
            let user = message.guild.members.cache.get(message.author.id);
            user.roles.add(role);
            message.channel.send({
              content: `Игроку <@${message.author.id}> - выдан VIP статус, спасибо за поддержку!`,
            });
            message.delete();
          }
        })
        .catch((collected) => {
          client.users.send(
            message.author,
            "Проверьте правильность ввода steamID64 или ссылки на профиль Steam\nSTEAMID64 можно получить на сайте https://steamid.io/\nSteamid должен быть тот же, что был указан в комментарии доната.\nДискорд для связи на случай затупа: ACTEPUKC#9551!"
          );
          message.delete();
        });
    }
  });
});
client.login(process.env.CLIENT_TOKEN);
