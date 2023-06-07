import axios from "axios";
import { config } from "dotenv";
config();

async function getBanFromBattlemetrics(message) {
  console.log(message.content);
  const apiKey = process.env.BATTLEMETRICS_API_KEY;
  const searchUrl = `https://api.battlemetrics.com/bans?filter[organization]=22378&filter[search]="${message.content}"`;

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    console.log(data);
    const { data } = response;
    return data.data;
  } catch (error) {
    console.log(error);
  }
}

export default getBanFromBattlemetrics;
