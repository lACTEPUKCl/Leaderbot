import axios from "axios";
import { EmbedBuilder } from "discord.js";
import options from "../config.js";
import { MongoClient } from "mongodb";
import { config } from "dotenv";
config();

const client = new MongoClient(process.env.DATABASE_URL);
const { seedRoleId, dbName, dbCollectionServers } = options;
const servers = options.serversSeedID;
let alreadyNotified = {};
let seedingInterval;

async function connectToDatabase() {
  await client.connect();
  return client.db(dbName).collection(dbCollectionServers);
}

async function closeConnection() {
  await client.close();
}

async function getServerInfo(serverId) {
  try {
    const response = await axios.get(
      `https://api.battlemetrics.com/servers/${serverId}`
    );
    return {
      name: response.data.data.attributes.name,
      players: response.data.data.attributes.players,
    };
  } catch (error) {
    console.error(`Ошибка при получении данных с сервера ${serverId}:`, error);
    return null;
  }
}

async function updateSeedingStatus(collection, serverIndex, seeding) {
  const serverIndexString = (serverIndex + 1).toString();
  await collection.updateOne({ _id: serverIndexString }, { $set: { seeding } });
}

async function notifyUsers(guild, message, serverName, serverId) {
  const role = guild.roles.cache.get(seedRoleId);
  if (!role) return;

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(serverName)
    .setURL(`https://www.battlemetrics.com/servers/squad/${serverId}`)
    .setDescription(message)
    .setThumbnail("https://example.com/server-icon.png")
    .addFields({
      name: "Как отписаться от рассылки",
      value:
        "Уберите эмодзи в канале по [ссылке](https://discord.com/channels/735515208348598292/1270808177700507729).",
      inline: false,
    })
    .setFooter({
      text: "Спасибо за вашу помощь!",
      iconURL:
        "https://cdn.discordapp.com/attachments/1179711462197968896/1271584403826540705/0000.png",
    })
    .setTimestamp();
  await guild.members.fetch();
  const membersWithRole = role.members;
  membersWithRole.forEach((member) => {
    member.send({ embeds: [embed] }).catch(() => {});
  });
}

async function seedingServers(guild) {
  const collection = await connectToDatabase();

  async function seedNextServer(serverIndex) {
    if (serverIndex >= servers.length) {
      console.log("Все сервера успешно подняты! Сидинг завершен.");
      clearInterval(seedingInterval);
      await endSeeding(guild);
      return;
    }

    const server = servers[serverIndex];
    const serverInfo = await getServerInfo(server.id);

    if (!serverInfo) {
      console.log(
        `Не удалось получить информацию о сервере ${server.id}, пропускаем его.`
      );
      seedNextServer(serverIndex + 1);
      return;
    }

    const { name, players } = serverInfo;

    if (players < 60) {
      if (!alreadyNotified[server.id]) {
        const message = `Мы начинаем сидить сервер ${name}`;
        await notifyUsers(guild, message, name, server.id);
        await updateSeedingStatus(collection, serverIndex, true);
        alreadyNotified[server.id] = true;
      }

      console.log(
        `Сервер ${name} имеет ${players} игроков. Проверка продолжается...`
      );
      seedingInterval = setTimeout(
        () => seedNextServer(serverIndex),
        60 * 1000
      );
    } else {
      console.log(
        `Сервер ${name} достиг 60+ игроков. Переходим к следующему серверу.`
      );
      await updateSeedingStatus(collection, serverIndex, false);
      seedNextServer(serverIndex + 1);
    }
  }

  try {
    seedNextServer(0);
  } catch (error) {
    console.error("Ошибка при выполнении команды seedingServers:", error);
  }
}

async function endSeeding(guild) {
  const collection = await connectToDatabase();

  try {
    await collection.updateMany({}, { $set: { seeding: false } });

    if (!alreadyNotified.global) {
      const role = await guild.roles.cache.get(seedRoleId);

      if (role) {
        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("Сидинг завершен")
          .setDescription("Спасибо за вашу помощь!")
          .setTimestamp();

        await guild.members.fetch();
        const membersWithRole = role.members;
        membersWithRole.forEach((member) => {
          member.send({ embeds: [embed] }).catch(() => {});
        });
      }

      alreadyNotified.global = true;
    }
  } catch (error) {
    console.error("Ошибка при завершении сидинга:", error);
  } finally {
    await closeConnection();
    alreadyNotified = {};
  }
}

export { seedingServers, endSeeding };
