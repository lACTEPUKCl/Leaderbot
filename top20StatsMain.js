import leaderboard from "./leaderboard.js";

async function top20StatsMain(leaderboardChannelId, db) {
  const statsConfig = [
    {
      sort: "kills",
      messageId: "1069615769610108938",
      authorName: "Топ 20 игроков по убийствам",
      seconds: 1000,
      status: "main",
    },
    {
      sort: "death",
      messageId: "1069615861582811178",
      authorName: "Топ 20 игроков по смертям",
      seconds: 5000,
      status: "main",
    },
    {
      sort: "revives",
      messageId: "1069615953438048276",
      authorName: "Топ 20 медиков",
      seconds: 10000,
      status: "main",
    },
    {
      sort: "teamkills",
      messageId: "1069616004457578627",
      authorName: "Топ 20 тимкилеров",
      seconds: 15000,
      status: "main",
    },
    {
      sort: "kd",
      messageId: "1069616217884741693",
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
