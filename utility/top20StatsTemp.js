import leaderboard from "./leaderboard.js";

async function top20StatsTemp(channelId, db) {
  const statsConfig = [
    {
      sort: "kills",
      messageId: "1179119350238691429",
      authorName: "Топ 20 игроков по убийствам",
      seconds: 1000,
      status: "temp",
    },
    {
      sort: "death",
      messageId: "1179119352155471983",
      authorName: "Топ 20 игроков по смертям",
      seconds: 5000,
      status: "temp",
    },
    {
      sort: "revives",
      messageId: "1179119354990825584",
      authorName: "Топ 20 медиков",
      seconds: 9000,
      status: "temp",
    },
    {
      sort: "teamkills",
      messageId: "1179119357683576885",
      authorName: "Топ 20 тимкилеров",
      seconds: 13000,
      status: "temp",
    },
    {
      sort: "kd",
      messageId: "1179119378013368360",
      authorName: "Топ 20 игроков по соотношению убийств к смертям",
      seconds: 17000,
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
