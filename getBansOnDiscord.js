import axios from "axios";
import { config } from "dotenv";
config();

async function getBanFromBattlemetrics(player) {
  const apiKey = process.env.BATTLEMETRICS_API_KEY;
  const searchUrl = `https://api.battlemetrics.com/bans?filter[organization]=22378&filter[search]=${player}`;

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const { data } = response;
    return data.data;
  } catch (error) {
    console.error("Ошибка при поиске игрока:", error.message);
    throw error;
  }
}

export default getBanFromBattlemetrics;
