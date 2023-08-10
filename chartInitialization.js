import createChart from "./chartTickRate.js";

async function chartInitialization(tickRateChannelId) {
  const statsConfig = [
    {
      serverId: "1",
      messageId: "1137382959930945576",
      seconds: 1000,
    },
    {
      serverId: "2",
      messageId: "1137382998984118312",
      seconds: 4000,
    },
    {
      serverId: "3",
      messageId: "1137383029514453144",
      seconds: 7000,
    },
    {
      serverId: "4",
      messageId: "1137383059298193599",
      seconds: 10000,
    },
  ];

  const getChart = statsConfig.map((config) =>
    createChart({
      channel: tickRateChannelId,
      serverId: config.serverId,
      messageId: config.messageId,
      seconds: config.seconds,
    })
  );
}

export default chartInitialization;
