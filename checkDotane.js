import fetchDonate from "./fetchDonate.js";
import fetch from "node-fetch";

async function checkDonate(steamApi, tempSteamId, donateUrl, callback) {
  try {
    const response = await fetch(donateUrl);
    if (response.ok) {
      callback();
      const json = await response.json();
      const steamIdRegex = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)/;
      console.log("response", tempSteamId);
      for (const element of tempSteamId) {
        const currentSteamId = element[2];

        for (const jsonEl of json.data) {
          const comment = jsonEl.comment;
          const steamID64 = comment.trim().match(/[0-9]{17}/);
          const groupsId = comment.trim().match(steamIdRegex)?.groups;
          const splitSteamId = groupsId?.steamId.split("/")[0];
          console.log("splitSteamId", splitSteamId);
          console.log("groupsId", groupsId, typeof groupsId !== "undefined");
          console.log(
            "steamID64",
            steamID64,
            steamID64?.[0] === currentSteamId
          );
          if (typeof groupsId !== "undefined") {
            try {
              const responseSteam = await fetch(
                `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApi}&vanityurl=${splitSteamId}`
              );
              const dataSteam = await responseSteam.json();
              console.log("dataSteam", dataSteam);
              if (dataSteam.response.steamid === currentSteamId) {
                fetchDonate(element, jsonEl);
                console.log(`${currentSteamId} прошел проверку`);
                break;
              }
            } catch (error) {
              console.log("Не удалось получить steamID");
              throw new Error(error);
            }
          }

          if (steamID64?.[0] === currentSteamId) {
            fetchDonate(element, jsonEl);
            console.log(`${currentSteamId} прошел проверку`);
            break;
          }
        }
        console.log("Закончил проверку");
      }
    }
  } catch (error) {
    console.log(error);
    setTimeout(() => {
      checkDonate(steamApi, tempSteamId, donateUrl, callback);
    }, 30000);
  }
}

export default checkDonate;
