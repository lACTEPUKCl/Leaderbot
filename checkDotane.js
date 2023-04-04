import fetchDonate from "./fetchDonate.js";
import fetch from "node-fetch";

async function checkDonate(steamApi, tempSteamId, donateUrl, callback) {
  try {
    let response = await fetch(donateUrl);
    if (response.ok) {
      callback();
      let json = await response.json();
      let steamId = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)/;
      tempSteamId.forEach((element) => {
        const currentSteamId = element[2];
        json.data.forEach(async (jsonEl) => {
          let comment = jsonEl.comment;
          let steamID64 = comment.match(/[0-9]{17}/);
          let groupsId = comment.match(steamId)?.groups;
          let splitSteamId = groupsId?.steamId.split("/")[0];

          if (typeof groupsId !== "undefined") {
            const responseSteam = await fetch(
              `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApi}&vanityurl=${splitSteamId}`
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
  } catch (e) {
    console.log(e);
  }
}

export default checkDonate;
