import fetch from "node-fetch";

async function getSteamId64(steamApi, content, callback) {
  const steamID64 = content.match(/\b[0-9]{17}\b/)?.[0];
  const steamId = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)/;
  const groupsId = content.match(steamId)?.groups;
  const splitSteamId = groupsId?.steamId.split("/")[0];

  if (groupsId) {
    try {
      const responseSteam = await fetch(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApi}&vanityurl=${splitSteamId}`
      );
      const dataSteam = await responseSteam.json();
      if (dataSteam.response.success === 1) {
        callback(dataSteam.response.steamid);
        return;
      }
    } catch (error) {
      callback(false);
    }
  }

  if (steamID64) {
    callback(steamID64);
    return;
  }
  callback(false);
  return null;
}

export default getSteamId64;
