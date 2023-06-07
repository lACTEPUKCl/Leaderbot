import axios from "axios";
import { config } from "dotenv";
config();

async function getBanFromBattlemetrics(message) {
  const apiKey = process.env.BATTLEMETRICS_API_KEY;
  const searchUrl = `https://api.battlemetrics.com/bans?filter[organization]=22378&filter[search]="${message.content}"`;

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const { data } = response;
    return data.data;
  } catch (error) {
    message.reply(
      `Игрок с Ником/SteamID ${message.content} не найден в списках банов`
    );
  }
}

export default getBanFromBattlemetrics;
