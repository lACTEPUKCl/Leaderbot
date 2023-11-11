import fetch from "node-fetch";
import getSteamId64 from "./getSteamID64.js";
import fetchDonate from "./fetchDonate.js";

async function checkDonate(
  steamApi,
  currentSteamId,
  donateUrl,
  message,
  vipRole,
  user
) {
  let retryCount = 0;
  let matchFound = false;

  try {
    while (retryCount < 3 && !matchFound) {
      let response = await fetch(donateUrl);

      while (!response.ok) {
        console.log(
          "Не удалось получить список донатов. Повторная попытка через 30 секунд..."
        );
        await new Promise((resolve) => setTimeout(resolve, 30000));
        response = await fetch(donateUrl);
      }

      if (response.ok) {
        const json = await response.json();

        for (const jsonEl of json.data) {
          const steamId64 = await getSteamId64(
            message,
            steamApi,
            jsonEl.comment,
            (steamId) => {
              if (steamId) {
                if (steamId === currentSteamId) {
                  fetchDonate(steamId, jsonEl, message, vipRole, user);
                  console.log(`${currentSteamId} найден в списках донатов`);
                  matchFound = true;
                  return;
                }
              }
            }
          );
        }
      }

      if (!matchFound) {
        console.log(
          `Совпадений не найдено. Повторная попытка через минуту... ${
            retryCount + 1
          }/3`
        );
        await new Promise((resolve) => setTimeout(resolve, 60000));
        retryCount++;
      }
    }

    if (retryCount === 3 && !matchFound) {
      console.log("Совпадений не найдено. Поиск закончен.");
      try {
        await message.author.send(
          "Проверьте правильность ввода steamID64 или ссылки на профиль Steam\nSTEAMID64 можно получить на сайте https://steamid.io/\nSteamid должен быть тот же, что был указан в комментарии доната.\nДискорд для связи на случай затупа: ACTEPUKC#9551"
        );
      } catch (error) {
        console.log(
          "Невозможно отправить сообщение пользователю",
          message.author.username
        );
      }
      try {
        await message.delete();
      } catch (error) {}
    }
  } catch (error) {
    console.log(error);
  }
}

export default checkDonate;
