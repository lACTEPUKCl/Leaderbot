import checkDonate from "./checkDonate.js";
import getSteamId64 from "./getSteamID64.js";
import checkBonuses from "./checkBonuses.js";

async function getSteamIDFromMessage(
  vip,
  db,
  message,
  steamApi,
  donateURL,
  vipRole,
  user,
  callback
) {
  const steamId64 = await getSteamId64(
    message,
    steamApi,
    message.content,
    (steamId) => {
      if (steamId && !vip) {
        checkDonate(steamApi, steamId, donateURL, message, vipRole, user);
      } else if (steamId && vip) {
        checkBonuses(steamId, message, vipRole, user, db);
      } else {
        message.delete();
        console.log(message.author.username, "Ввел некорректный steamID");
        try {
          message.author.send(
            "Проверьте правильность ввода steamID64 или ссылки на профиль Steam\nSTEAMID64 можно получить на сайте https://steamid.io/\nSteamid должен быть тот же, что был указан в комментарии доната.\nДискорд для связи на случай затупа: ACTEPUKC#9551"
          );
        } catch (error) {
          console.log(
            "Невозможно отправить сообщение пользователю",
            message.author.username
          );
        }
        callback(false);
        return;
      }
    }
  );
}

export default getSteamIDFromMessage;
