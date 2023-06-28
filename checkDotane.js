import fetchDonate from "./fetchDonate.js";
import fetch from "node-fetch";

async function checkDonate(steamApi, tempSteamId, donateUrl, callback) {
  let retryCount = 0;
  this.matchFound = false;
  try {
    while (retryCount < 3 && !this.matchFound) {
      let response = await fetch(donateUrl);

      if (!response.ok) {
        if (this.matchFound) return;
        console.log(
          "Не удалось получить список донатов. Повторная попытка через 20 секунд..."
        );
        console.log("1", this.matchFound);
        await new Promise((resolve) => setTimeout(resolve, 20000));
        retryCount++;
      } else {
        if (this.matchFound) return;
        const json = await response.json();
        const steamIdRegex =
          /^https?:\/\/steamcommunity.com\/id\/(?<steamId>.*)/;
        console.log("response", tempSteamId);

        for (const element of tempSteamId) {
          const currentSteamId = element[2];

          for (const jsonEl of json.data) {
            const comment = jsonEl.comment;
            const steamID64 = comment.trim().match(/[0-9]{17}/);
            const groupsId = comment.trim().match(steamIdRegex)?.groups;
            const splitSteamId = groupsId?.steamId?.split("/")[0];

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
                  this.matchFound = true;
                  console.log("2", this.matchFound);
                }
              } catch (error) {
                console.log("Не удалось получить steamID");
                throw new Error(error);
              }
            }
            console.log("3", this.matchFound);
            if (steamID64?.[0] === currentSteamId) {
              fetchDonate(element, jsonEl);
              console.log(`${currentSteamId} найден в списках донатов`);
              this.matchFound = true;
              console.log("4", this.matchFound);
            }
            if (this.matchFound) break;
          }
          if (this.matchFound) break;
          console.log("Закончил проверку");
        }

        // Выходим из цикла, если найдены совпадения
        if (this.matchFound) return;
        console.log("5", this.matchFound);
      }
      console.log("6", this.matchFound);
      if (!this.matchFound) {
        // Повторная попытка через 30 секунд
        console.log("7", this.matchFound);
        console.log(
          "Совпадений не найдено. Повторная попытка через 30 секунд..."
        );
        await new Promise((resolve) => setTimeout(resolve, 30000));
        retryCount++;
      }
    }

    if (retryCount === 3 && !this.matchFound) {
      console.log("Совпадений не найдено");
    }

    callback();
  } catch (error) {
    console.log(error);
  }
}

export default checkDonate;
