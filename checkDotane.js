import fetchDonate from "./fetchDonate.js";
import fetch from "node-fetch";

async function checkDonate(tempSteamId, donateUrl, callback) {
  try {
    let response = await fetch(donateUrl);
    if (response.ok) {
      callback();
      let json = await response.json();
      let steamId = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)\//;
      tempSteamId.forEach((element) => {
        const currentSteamId = element[2];
        json.data.forEach(async (jsonEl) => {
          let comment = jsonEl.comment;
          let steamID64 = comment.match(/[0-9]{17}/);
          let groupsId = comment.match(steamId)?.groups;
          if (groupsId) {
            const responseSteam = await fetch(
              `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=78625F21328E996397F2930B25F4C91F&vanityurl=${groupsId.steamId}`
            );
            const dataSteam = await responseSteam.json();
            if (dataSteam.response.steamid === currentSteamId) {
              fetchDonate(element, jsonEl);
            }
          }
          if (steamID64?.[0] === currentSteamId) {
            fetchDonate(element, jsonEl);
          }
        });
      });
    }
    console.log(tempSteamId);
  } catch (e) {
    console.log(e);
  }
}

export default checkDonate;
