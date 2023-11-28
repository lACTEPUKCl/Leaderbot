import { config } from "dotenv";
config();
import axios from "axios";

const apiURL_BM = "https://api.battlemetrics.com/players/match";
const steamID_BM = "76561198979435382";
const serverId = ["8592347", "19616682", "16963414", "19616726", "22478939"];
const tokenBM = process.env.BATTLEMETRICS_API_KEY_RCON;
const requestBody_BM = {
  data: [
    {
      type: "identifier",
      attributes: {
        type: "steamID",
        identifier: steamID_BM,
      },
    },
  ],
};

const headers = {
  headers: {
    Authorization: `Bearer ${tokenBM}`,
    "Content-Type": "application/json",
  },
};

try {
  const res_BM = await axios.post(apiURL_BM, requestBody_BM, headers);
  const BMPlayerId = res_BM.data.data[0].id;
  let playedTimeAllServersBM = 0;

  for (let i = 0, res; i < serverId; i++) {
    console.log("asd");
    await axios
      .get(
        `https://api.battlemetrics.com/players/${BMPlayerId}/servers/${serverId[i]}`
      )
      .then(
        (res) => (playedTimeAllServersBM += res.data.data.attributes.timePlayed)
      )
      .catch((err) => {});
  }
  console.log(playedTimeAllServersBM);
} catch (error) {
  console.error("Ошибка при получении данных из Battlemetrics");
}
