import fetchDonate from "./fetchDonate.js";
import fetch from "node-fetch";

async function checkDonate(steamApi, tempSteamId, donateUrl, callback) {
  try {
    let response = await fetch(donateUrl);

    if (!response.ok) {
      console.log(
        "Не удалось получить список донатов. Повторная попытка через 10 секунд..."
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
      response = await fetch(donateUrl);
    }

    if (response.ok) {
      const json = await response.json();
      const steamIdRegex = /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)/;
      console.log("response", tempSteamId);

      for (const element of tempSteamId) {
        const currentSteamId = element[2];

        for (const jsonEl of json.data) {
          const comment = jsonEl.comment;
          const steamID64 = comment.trim().match(/[0-9]{17}/);
          const groupsId = comment.trim().match(steamIdRegex)?.groups;
          const splitSteamId = groupsId?.steamId?.split("/")[0];
          console.log("splitSteamId", splitSteamId);
          console.log("groupsId", groupsId, typeof groupsId !== "undefined");
          console.log(
            "steamID64",
            steamID64,
            steamID64?.[0] === currentSteamId
          );

          if (typeof groupsId !== "undefined") {
            try {
              const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApi}&vanityurl=${splitSteamId}`;
              const responseSteam = await fetch(resolveUrl);
              const dataSteam = await responseSteam.json();
              console.log("dataSteam", dataSteam);

              if (
                dataSteam.response.success === 1 &&
                dataSteam.response.steamid === currentSteamId
              ) {
                fetchDonate(element, jsonEl);
                console.log(`${currentSteamId} найден в списках донатов`);
                break;
              }
            } catch (error) {
              console.log("Не удалось получить steamID");
              throw new Error(error);
            }
          }

          if (steamID64?.[0] === currentSteamId) {
            fetchDonate(element, jsonEl);
            console.log(`${currentSteamId} найден в списках донатов`);
            break;
          }
        }

        console.log("Закончил проверку");
      }
    } else {
      console.log("Не удалось получить список донатов");
    }

    callback();
  } catch (error) {
    console.log(error);
  }
}

export default checkDonate;
