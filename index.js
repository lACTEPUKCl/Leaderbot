import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { config } from "dotenv";
config();
import creater from "./vip-creater.js";
import cleaner from "./vip-cleaner.js";
import fetch from "node-fetch";
import {
  setTimeout as setTimeoutPromise,
  setInterval,
} from "node:timers/promises";

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
let stats = [];
let injectKd = [];
let statsSort = [];
let players = [];
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const channel = client.channels.cache.get("1069615679281561600");
  async function sortUsers(sort) {
    try {
      let response = await fetch(process.env.FIREBASE_JSON);
      const users = await response.json();
      for (const key in users) {
        stats.push(users[key]);
      }
      stats = Object.values(stats);
      for (const key in stats) {
        stats[key].kd = stats[key].kills / stats[key].death;
        injectKd.push(stats[key]);
        if (injectKd[key].kills > 500) {
          statsSort.push(stats[key]);
        }
      }

      const sortBy = statsSort.sort((a, b) => (a[sort] < b[sort] ? 1 : -1));
      for (const key in sortBy) {
        const a = sortBy[key];
        players.push(
          `(${key}) ` +
            a.name +
            ": У: " +
            a.kills +
            " С: " +
            a.death +
            " П: " +
            a.revives +
            " ТK: " +
            a.teamkills +
            " K/D: " +
            a.kd.toFixed(2)
        );
        if (key === "20") return;
      }
    } catch (error) {
      console.log(error);
    }
  }

  // Редактирование Embed
  async function editEmbed(sort, messageId, authorName, seconds) {
    setTimeout(async () => {
      await sortUsers(`${sort}`);
      await channel.messages
        .fetch(`${messageId}`)
        .then((message) => {
          const playersTable = Array(20)
            .fill(0)
            .map((e, i) => players[i + 1])
            .join("\r\n");
          let exampleEmbed = new EmbedBuilder()
            .setAuthor({
              name: `${authorName}`,
              iconURL:
                "https://cdn.discordapp.com/icons/735515208348598292/21416c8e956be0ffed0b7fc49afc5624.webp",
            })
            .setDescription(playersTable)
            .setColor(0x0099ff)
            .setTimestamp()
            .setFooter({
              text: "Статистика обновлялась",
              iconURL:
                "https://cdn.discordapp.com/icons/735515208348598292/21416c8e956be0ffed0b7fc49afc5624.webp",
            });
          message.edit({ embeds: [exampleEmbed] });
          stats = [];
          injectKd = [];
          statsSort = [];
          players = [];
        })
        .catch(console.error);
    }, seconds);
  }

  async function getStats() {
    const kills = editEmbed(
      "kills",
      "1069615769610108938",
      "Топ 20 игроков по убийствам",
      1000
    );
    const death = editEmbed(
      "death",
      "1069615861582811178",
      "Топ 20 игроков по смертям",
      2000
    );
    const revives = editEmbed(
      "revives",
      "1069615953438048276",
      "Топ 20 медиков",
      3000
    );
    const teamkills = editEmbed(
      "teamkills",
      "1069616004457578627",
      "Топ 20 тимкилеров",
      4000
    );
    const kd = editEmbed(
      "kd",
      "1069616217884741693",
      "Топ 20 игроков по соотношению убийств к смертям",
      5000
    );
    Promise.all([kills, death, revives, kd]);
  }
  // Редактирование Embed

  async function startEmbedEdit() {
    const interval = 3600000;
    for await (const startTime of setInterval(interval, getStats())) {
      console.log("Statistics updated");
      getStats();
    }
  }
  startEmbedEdit();
  let guild = client.guilds.cache.get("735515208348598292");
  cleaner.vipCleaner((ids) =>
    ids.forEach((element) => {
      let user = guild.members.cache.get(element);
      guild.members.fetch({ user, cache: true }).then().catch(console.error);
      user?.roles.remove("1072902141666136125");
    })
  );
  //reaction
  client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    if (message.channelId !== "819484295709851649") return;
    if (message.channelId === "819484295709851649") {
      const content = message.content;
      let result = content.match(
        /[А-Яа-яA-Za-z0-9_-]+\n[0-9]{17}\n[0-9]+\.[0-9]+\.[0-9]+\n[0-9]+/g
      );
      if (!result) {
        message.reply({
          content:
            "`Проверьте правильность заполнения сообщения\nНик в игре\nSTEAMID64` (можно получить на сайте https://steamid.io/)\n`Дата доната\nСумма доната\nПример сообщения:\nMelomory\n76561198979435382\n08.02.2023\n300`",
        });
        return;
      }
    }
    const filter = (reaction, user) => {
      const id = [
        "132225869698564096",
        "365562331121582090",
        "887358770211082250",
      ];
      const userId = user.id;
      return ["👍"].includes(reaction.emoji.name) && id.includes(userId);
    };
    message.awaitReactions({ filter, max: 1 }).then((collected) => {
      const reaction = collected.first();
      if (typeof reaction == "undefined") return;
      if (reaction.emoji?.name === "👍") {
        const objMessage = message.content.split("\n");
        const nickname = objMessage[0].trim();
        const steamID = objMessage[1].trim();
        const time = objMessage[2].trim();
        const summ = objMessage[3].trim();
        const discordId = message.author.id;
        creater.vipCreater(steamID, nickname, time, summ, discordId);
        let role = message.guild.roles.cache.get("1072902141666136125");
        let user = message.guild.members.cache.get(message.author.id);
        user.roles.add(role);
        message.channel.send({
          content: `Игроку ${nickname} - выдан VIP статус, спасибо за поддержку!`,
        });
        message.delete();
      }
    });
  });
  //reaction
});
client.login(process.env.CLIENT_TOKEN);
