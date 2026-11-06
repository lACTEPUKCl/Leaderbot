import { fetchJson } from "./fetchJson.js";

async function getSteamId64(steamApi, content) {
  const steamID64 = content.match(/\b[0-9]{17}\b/)?.[0];
  const steamId = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)/;
  const groupsId = content.match(steamId)?.groups;
  const splitSteamId = groupsId?.steamId.split("/")[0];

  if (groupsId) {
    try {
      const dataSteam = await fetchJson(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApi}&vanityurl=${splitSteamId}`
      );
      if (dataSteam.response.success === 1) {
        return dataSteam.response.steamid;
      }
    } catch (error) {
      return false;
    }
  }

  if (steamID64) {
    return steamID64;
  }
  return false;
}

export default getSteamId64;
