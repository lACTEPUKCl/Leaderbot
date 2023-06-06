import axios from "axios";

async function getBanFromBattlemetrics(player) {
  const apiKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6IjMzMzRiMjUzMWU1YmI2ZGYiLCJpYXQiOjE2ODU5MTM1NjcsIm5iZiI6MTY4NTkxMzU2NywiaXNzIjoiaHR0cHM6Ly93d3cuYmF0dGxlbWV0cmljcy5jb20iLCJzdWIiOiJ1cm46dXNlcjo2MDM5NDEifQ.YnnqQRXj5F-cCnzettO_rdx3Tn_lS_vqlk4-7zZPMKo";
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
