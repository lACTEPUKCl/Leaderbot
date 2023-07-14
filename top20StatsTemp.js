import leaderboard from "./leaderboard.js";

async function top20StatsTemp(channelId, db) {
  const statsConfig = [
    {
      sort: "kills",
      messageId: "1119327644585037884",
      authorName: "Топ 20 игроков по убийствам",
      seconds: 1000,
      status: "temp",
    },
    {
      sort: "death",
      messageId: "1119327655217594389",
      authorName: "Топ 20 игроков по смертям",
      seconds: 5000,
      status: "temp",
    },
    {
      sort: "revives",
      messageId: "1119327661202886789",
      authorName: "Топ 20 медиков",
      seconds: 10000,
      status: "temp",
    },
    {
      sort: "teamkills",
      messageId: "1119327665392980089",
      authorName: "Топ 20 тимкилеров",
      seconds: 15000,
      status: "temp",
    },
    {
      sort: "kd",
      messageId: "1119327669188841502",
      authorName: "Топ 20 игроков по соотношению убийств к смертям",
      seconds: 20000,
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
