import leaderboard from "./leaderboard.js";
import options from "../config.js";

const {
  top20KillsMessageIDTemp,
  top20DeathMessageIDTemp,
  top20RevivesMessageIDTemp,
  top20TKMessageIDTemp,
  top20KDMessageIDTemp,
  top20SeedMessageIDTemp,
} = options;
async function top20StatsTemp(channelId, db) {
  const statsConfig = [
    {
      sort: "kills",
      messageId: top20KillsMessageIDTemp,
      authorName: "Топ 20 игроков по убийствам",
      seconds: 3000,
      status: "temp",
    },
    {
      sort: "death",
      messageId: top20DeathMessageIDTemp,
      authorName: "Топ 20 игроков по смертям",
      seconds: 7000,
      status: "temp",
    },
    {
      sort: "revives",
      messageId: top20RevivesMessageIDTemp,
      authorName: "Топ 20 медиков",
      seconds: 11000,
      status: "temp",
    },
    {
      sort: "teamkills",
      messageId: top20TKMessageIDTemp,
      authorName: "Топ 20 тимкилеров",
      seconds: 14000,
      status: "temp",
    },
    {
      sort: "kd",
      messageId: top20KDMessageIDTemp,
      authorName: "Топ 20 игроков по соотношению убийств к смертям",
      seconds: 18000,
      status: "temp",
    },
    {
      sort: "seed",
      messageId: top20SeedMessageIDTemp,
      authorName: "Топ 20 сидеров",
      seconds: 22000,
      status: "temp",
    },
  ];

  const getStats = statsConfig.map((config) =>
    leaderboard({
      channel: channelId,
      db,
      sort: config.sort,
      messageId: config.messageId,
      authorName: config.authorName,
      seconds: config.seconds,
      status: config.status,
    })
  );
}

export default top20StatsTemp;
