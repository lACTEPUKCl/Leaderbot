import leaderboard from "./leaderboard.js";

async function top20StatsMain(leaderboardChannelId, db) {
  const statsConfig = [
    {
      sort: "kills",
      messageId: "1179120519451258891",
      authorName: "Топ 20 игроков по убийствам",
      seconds: 3000,
      status: "main",
    },
    {
      sort: "death",
      messageId: "1179120526510268477",
      authorName: "Топ 20 игроков по смертям",
      seconds: 7000,
      status: "main",
    },
    {
      sort: "revives",
      messageId: "1179120535205056562",
      authorName: "Топ 20 медиков",
      seconds: 11000,
      status: "main",
    },
    {
      sort: "teamkills",
      messageId: "1179120543249735803",
      authorName: "Топ 20 тимкилеров",
      seconds: 15000,
      status: "main",
    },
    {
      sort: "kd",
      messageId: "1179120545468522627",
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
