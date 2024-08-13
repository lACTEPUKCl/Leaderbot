import axios from "axios";
import { EmbedBuilder } from "discord.js";
import options from "../config.js";
import { MongoClient } from "mongodb";
import { config } from "dotenv";
config();

const client = new MongoClient(process.env.DATABASE_URL);
const { seedRoleId, dbName, dbCollectionServers } = options;
const servers = options.serversSeedID;
let alreadyNotified = false;

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

  try {
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      const serverInfo = await getServerInfo(server.id);

      if (!serverInfo) continue;

      const { name, players } = serverInfo;

      if (players < 60) {
        const message = `Мы начинаем сидить сервер ${name}`;
        await notifyUsers(guild, message, name, server.id);

        await updateSeedingStatus(collection, i, true);
        alreadyNotified = false;
        break;
      } else if (players >= 60 && i < servers.length - 1) {
        await updateSeedingStatus(collection, i, false);
        continue;
      } else if (players >= 60 && i === servers.length - 1) {
        if (!alreadyNotified) {
          const message = `Все сервера успешно подняты! Огромное спасибо за вашу помощь!`;
          await notifyUsers(guild, message, name, server.id);
          alreadyNotified = true;
        }
        await updateSeedingStatus(collection, i, false);
      }
    }
  } catch (error) {
    console.error("Ошибка при выполнении команды seedingServers:", error);
  } finally {
    await closeConnection();
  }
}

async function endSeeding(guild) {
  const collection = await connectToDatabase();

  try {
    await collection.updateMany({}, { $set: { seeding: false } });

    if (!alreadyNotified) {
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
    }
  } catch (error) {
    console.error("Ошибка при завершении сидинга:", error);
  } finally {
    await closeConnection();
    alreadyNotified = false;
  }
}

export { seedingServers, endSeeding };
