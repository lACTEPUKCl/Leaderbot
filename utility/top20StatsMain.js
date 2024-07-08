import leaderboard from "./leaderboard.js";
import options from "../config.js";

const {
  top20KillsMessageID,
  top20DeathMessageID,
  top20RevivesMessageID,
  top20TKMessageID,
  top20KDMessageID,
} = options;

async function top20StatsMain(leaderboardChannelId, db) {
  const statsConfig = [
    {
      sort: "kills",
      messageId: top20KillsMessageID,
      authorName: "Топ 20 игроков по убийствам",
      seconds: 3000,
      status: "main",
    },
    {
      sort: "death",
      messageId: top20DeathMessageID,
      authorName: "Топ 20 игроков по смертям",
      seconds: 7000,
      status: "main",
    },
    {
      sort: "revives",
      messageId: top20RevivesMessageID,
      authorName: "Топ 20 медиков",
      seconds: 11000,
      status: "main",
    },
    {
      sort: "teamkills",
      messageId: top20TKMessageID,
      authorName: "Топ 20 тимкилеров",
      seconds: 15000,
      status: "main",
    },
    {
      sort: "kd",
      messageId: top20KDMessageID,
      authorName: "Топ 20 игроков по соотношению убийств к смертям",
      seconds: 20000,
      status: "main",
    },
  ];

  const getStats = statsConfig.map((config) =>
    leaderboard({
      channel: leaderboardChannelId,
      db,
      sort: config.sort,
      messageId: config.messageId,
      authorName: config.authorName,
      seconds: config.seconds,
      status: config.status,
    })
  );
}

export default top20StatsMain;
