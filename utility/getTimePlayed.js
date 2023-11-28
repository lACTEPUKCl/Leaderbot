import { config } from "dotenv";
import axios from "axios";

config();

const apiURL_BM = "https://api.battlemetrics.com/players/match";
const serverId = ["8592347", "19616682", "16963414", "22478939"];
const tokenBM = process.env.BATTLEMETRICS_API_KEY_RCON;
const headers = {
  headers: {
    Authorization: `Bearer ${tokenBM}`,
    "Content-Type": "application/json",
  },
};

const getTimePlayed = async (steamID) => {
  const requestBody_BM = {
    data: [
      {
        type: "identifier",
        attributes: {
          type: "steamID",
          identifier: steamID,
        },
      },
    ],
  };

  try {
    const res_BM = await axios.post(apiURL_BM, requestBody_BM, headers);
    const BMPlayerId = res_BM.data.data[0].relationships.player.data.id;
    let playedTimeAllServersBM = 0;

    for (let i = 0; i < serverId.length; i++) {
      try {
        const res = await axios.get(
          `https://api.battlemetrics.com/players/${BMPlayerId}/servers/${serverId[i]}`
        );
        playedTimeAllServersBM += res.data.data.attributes.timePlayed;
      } catch (err) {}
    }

    return playedTimeAllServersBM;
  } catch (error) {
    console.error("Ошибка при получении данных из Battlemetrics");
  }
};

export default getTimePlayed;
