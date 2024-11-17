import axios from "axios";
import fs from "fs";
import { MongoClient } from "mongodb";
import path from "path";
import options from "../config.js";

async function clearChannelMessages(channel) {
  try {
    const fetchedMessages = await channel.messages.fetch({ limit: 100 }); // Получаем последние 100 сообщений
    for (const message of fetchedMessages.values()) {
      await message.delete(); // Удаляем каждое сообщение
    }
    console.log(`Все предыдущие сообщения в канале ${channel.id} удалены.`);
  } catch (error) {
    console.error(
      `Ошибка при очистке сообщений в канале ${channel.id}:`,
      error.message
    );
  }
}

async function adminsactivity(discordGuild) {
  const { adminsCfgPath, dbName, adminCollectionName, activityChannelId } =
    options;
  const apiKey = process.env.BATTLEMETRICS_API_KEY_ADMINS;
  const mongoUri = process.env.DATABASE_URL;

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(adminCollectionName);

  function extractAdmins() {
    const filePath = path.join(adminsCfgPath, "Admins.cfg");

    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл не найден: ${filePath}`);
    }

    const data = fs.readFileSync(filePath, "utf8");

    const adminRegex = /Admin=(\d+):Admin\s*\/\/\s*DiscordID\s*(\d+)/g;

    const admins = [];
    let match;

    while ((match = adminRegex.exec(data)) !== null) {
      const [_, steamID, discordID] = match;
      admins.push({ steamID, discordID });
    }

    return admins;
  }

  async function getDiscordNickname(discordGuild, discordId) {
    try {
      const member = await discordGuild.members.fetch(discordId);

      return member.nickname || member.user.globalName || member.user.username; // Возвращаем никнейм на сервере или общий никнейм
    } catch (error) {
      console.error(
        `Ошибка при получении ника для DiscordID ${discordId}:`,
        error.message
      );
      return null;
    }
  }

  async function getPlayerDataBySteamId(steamId) {
    try {
      const response = await axios.post(
        "https://api.battlemetrics.com/players/match",
        {
          data: [
            {
              type: "identifier",
              attributes: {
                type: "steamID",
                identifier: steamId,
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const playerData = response.data.data[0];
      if (playerData && playerData.attributes) {
        return {
          bmuserid: playerData.relationships.player.data.id,
          lastSeen: playerData.attributes.lastSeen || "нет данных",
        };
      }

      return null;
    } catch (error) {
      console.error(
        `Ошибка при запросе данных для SteamID ${steamId}:`,
        error.message
      );
      return null;
    }
  }

  async function createProfileInMongo(discordId, name, bmuserid, lastSeen) {
    try {
      const newProfile = {
        _id: discordId,
        name: name || `User_${discordId}`,
        warn: 0,
        reasons: [],
        bmuserid: bmuserid,
        lastseen: lastSeen || new Date(),
      };

      await collection.insertOne(newProfile);
      console.log(`Создан профиль для DiscordID: ${discordId}`);
    } catch (error) {
      console.error(
        `Ошибка при создании профиля для DiscordID ${discordId}:`,
        error.message
      );
    }
  }

  async function updateNicknameInMongo(discordId, newNickname) {
    try {
      const result = await collection.updateOne(
        { _id: discordId },
        { $set: { name: newNickname } }
      );
      if (result.modifiedCount > 0) {
        console.log(
          `Обновлён ник для DiscordID: ${discordId} -> ${newNickname}`
        );
      }
    } catch (error) {
      console.error(
        `Ошибка при обновлении ника для DiscordID ${discordId}:`,
        error.message
      );
    }
  }

  async function getWarningsFromMongo(discordId) {
    try {
      const user = await collection.findOne({ _id: discordId });
      return user ? user.warn || 0 : 0;
    } catch (error) {
      console.error("Ошибка при подключении к MongoDB:", error.message);
      return 0;
    }
  }

  const admins = extractAdmins();
  const results = [];

  const channel = await discordGuild.channels.fetch(activityChannelId);

  if (channel && channel.isTextBased()) {
    await clearChannelMessages(channel); // Удаляем все предыдущие сообщения
  } else {
    console.error(`Канал с ID ${activityChannelId} не найден или недоступен.`);
    return;
  }

  for (const admin of admins) {
    try {
      console.log(`Получаем данные для SteamID: ${admin.steamID}...`);

      const playerData = await getPlayerDataBySteamId(admin.steamID);
      const discordNickname = await getDiscordNickname(
        discordGuild,
        admin.discordID
      );

      if (!playerData) {
        console.log(`SteamID: ${admin.steamID} не найден в BattleMetrics.`);
        await createProfileInMongo(
          admin.discordID,
          discordNickname || `User_${admin.discordID}`,
          `BM_${admin.discordID}`,
          null
        );
        continue;
      }

      const warnings = await getWarningsFromMongo(admin.discordID);

      const currentProfile = await collection.findOne({ _id: admin.discordID });
      if (currentProfile) {
        if (currentProfile.name !== discordNickname) {
          await updateNicknameInMongo(admin.discordID, discordNickname);
        }
      } else {
        await createProfileInMongo(
          admin.discordID,
          discordNickname || `User_${admin.discordID}`,
          playerData.bmuserid,
          playerData.lastSeen
        );
      }

      const bmProfileLink = `https://www.battlemetrics.com/rcon/players/${playerData.bmuserid}`;
      const now = new Date();
      const lastSeenDate = new Date(playerData.lastSeen);
      const daysAgo = Math.floor((now - lastSeenDate) / (1000 * 60 * 60 * 24));
      const daysText =
        daysAgo === 0
          ? "сегодня"
          : daysAgo === 1
          ? "день назад"
          : daysAgo > 1 && daysAgo < 5
          ? `${daysAgo} дня назад`
          : `${daysAgo} дней назад`;

      const message = `<@!${admin.discordID}> | [Battlemetrics](${bmProfileLink}) | Последняя сессия: **${daysText}** | Страйки: **${warnings}**`;

      if (channel && channel.isTextBased()) {
        await channel.send(message);
      }

      results.push({
        discordID: admin.discordID,
        bmProfileLink,
        lastSeen: playerData.lastSeen,
        warnings,
      });
    } catch (error) {
      console.error(
        `Ошибка при обработке администратора ${admin.discordID}:`,
        error.message
      );
    }
  }

  await client.close();

  console.log("\nРезультаты:");
  results.forEach(({ discordID, bmProfileLink, lastSeen, warnings }) => {
    console.log(
      `DiscordID: ${discordID}, Ссылка на BM профиль: ${bmProfileLink}, Последняя сессия: ${lastSeen}, Страйки: ${warnings}`
    );
  });

  return results;
}

export default adminsactivity;
