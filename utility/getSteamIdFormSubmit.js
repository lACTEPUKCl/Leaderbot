import { MongoClient } from "mongodb";
import getSteamId64 from "./getSteamID64.js";
import options from "../config.js";

async function steamIdFormSubmit(
  interaction,
  steamLink,
  dbLink,
  steamApi,
  seedChannelId
) {
  const clientdb = new MongoClient(dbLink);
  const discordID = interaction.user.id;
  const { donationLink, dbCollection, dbName } = options;
  try {
    const steamID = await getSteamId64(steamApi, steamLink);
    if (steamID) {
      await clientdb.connect();
      const db = clientdb.db(dbName);
      const collection = db.collection(dbCollection);
      const existingDiscord = await collection.findOne({
        discordid: discordID,
      });
      const existingSteam = await collection.findOne({ _id: steamID });

      if (!existingSteam) {
        return interaction.reply({
          content:
            "Пользователь не найден в списках игроков, проверьте правильность ввода Steam профиля",
          ephemeral: true,
        });
      }

      if (existingSteam && existingSteam.discordid === discordID) {
        return interaction.reply({
          content:
            "Указанный Steam профиль уже привязан к вашему Discord аккаунту!",
          ephemeral: true,
        });
      }

      if (existingSteam && existingSteam.discordid) {
        return interaction.reply({
          content:
            "Указанный Steam профиль уже привязан к другому Discord аккаунту. Если это ваш SteamID, обратитесь к администратору https://discord.com/channels/735515208348598292/1068565169694851182!",
          ephemeral: true,
        });
      }

      if (existingDiscord && existingDiscord._id) {
        return interaction.reply({
          content: "Ваш Discord аккаунт уже привязан к другому Steam профилю!",
          ephemeral: true,
        });
      }

      const filter = {
        _id: steamID,
      };

      const update = {
        $set: {
          discordid: discordID,
        },
      };

      await collection.updateOne(filter, update, {
        upsert: true,
      });

      await clientdb.close();

      if (interaction.channelId === seedChannelId) {
        return interaction.reply({
          content:
            "Steam профиль успешно привязан к аккаунту! Время ивентового сида с 10:00 до 22:00",
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `Steam профиль успешно привязан к аккаунту!\nСкопируйте ваш SteamID: **${steamID}** или свою ссылку на Steam профиль\nВставьте его в поле 'Комментарий' по ссылке ${donationLink}`,
          ephemeral: true,
        });
      }
    }
  } catch (e) {
    console.error("Error in steamIdFormSubmit:", e);
  }
}

export default steamIdFormSubmit;
