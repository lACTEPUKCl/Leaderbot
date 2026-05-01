import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";
import options from "../config.js";

loadEnv();

const DB_URL = process.env.DATABASE_URL;
const CLAN_DB = "ticketBotDB";
const CLAN_COLLECTION = "clans";
const STATS_DB = "SquadJS";
const STATS_COLLECTION = "mainstats";
const { discordServerId } = options;

async function resolveDiscordIds(statsCollection, steamIds) {
  const map = new Map();
  if (!steamIds.length) return map;

  const docs = await statsCollection
    .find({ _id: { $in: steamIds } }, { projection: { _id: 1, discordid: 1 } })
    .toArray();

  for (const doc of docs) {
    if (
      doc.discordid &&
      typeof doc.discordid === "string" &&
      doc.discordid.length > 0
    ) {
      map.set(doc._id, doc.discordid);
    }
  }

  return map;
}

export async function syncClanRoles(client) {
  if (!DB_URL) {
    console.error("[clanRoleSync] Не задан DATABASE_URL в окружении");
    return;
  }
  if (!discordServerId) {
    console.error("[clanRoleSync] Не задан discordServerId в config.js");
    return;
  }

  const mongoClient = new MongoClient(DB_URL);
  console.log("[clanRoleSync] Старт синхронизации клановых ролей...");

  try {
    await mongoClient.connect();

    const clansCol = mongoClient.db(CLAN_DB).collection(CLAN_COLLECTION);
    const statsCol = mongoClient.db(STATS_DB).collection(STATS_COLLECTION);
    const allClans = await clansCol
      .find(
        { status: { $ne: "deleted" } },
        { projection: { tag: 1, discordRoleId: 1, members: 1, status: 1 } },
      )
      .toArray();

    const guild = await client.guilds.fetch(discordServerId);
    const guildMembers = await guild.members.fetch();

    let totalAdded = 0;
    let totalRemoved = 0;
    let clansProcessed = 0;

    for (const clan of allClans) {
      const tag = clan.tag;
      const roleId = clan.discordRoleId;

      if (!roleId) {
        continue;
      }

      let role;
      try {
        role = await guild.roles.fetch(roleId);
      } catch {
        console.warn(
          `[clanRoleSync] Роль ${roleId} для клана [${tag}] не найдена в Discord, пропускаем`,
        );
        continue;
      }

      if (!role) {
        console.warn(
          `[clanRoleSync] Роль ${roleId} для клана [${tag}] = null, пропускаем`,
        );
        continue;
      }

      const members = clan.members || [];
      const memberSteamIds = members
        .map((m) => m.steamId)
        .filter((id) => typeof id === "string" && id.length > 0);

      const steamToDiscord = await resolveDiscordIds(statsCol, memberSteamIds);
      const shouldHaveRole = new Set(steamToDiscord.values());

      for (const discordId of shouldHaveRole) {
        const member = guildMembers.get(discordId);
        if (!member) continue;

        if (!member.roles.cache.has(roleId)) {
          try {
            await member.roles.add(
              roleId,
              `[clanRoleSync] Участник клана [${tag}]`,
            );
            totalAdded++;
          } catch (err) {
            console.error(
              `[clanRoleSync] Не удалось выдать роль [${tag}] пользователю ${discordId}:`,
              err.message,
            );
          }
        }
      }

      for (const guildMember of guildMembers.values()) {
        if (!guildMember.roles.cache.has(roleId)) continue;
        if (shouldHaveRole.has(guildMember.id)) continue;

        try {
          await guildMember.roles.remove(
            roleId,
            `[clanRoleSync] Не является участником клана [${tag}]`,
          );
          totalRemoved++;
        } catch (err) {
          console.error(
            `[clanRoleSync] Не удалось снять роль [${tag}] с ${guildMember.id}:`,
            err.message,
          );
        }
      }

      clansProcessed++;
    }

    console.log(
      `[clanRoleSync] Синхронизация завершена. Кланов: ${clansProcessed}, выдано: ${totalAdded}, снято: ${totalRemoved}.`,
    );
  } catch (err) {
    console.error("[clanRoleSync] Общая ошибка:", err);
  } finally {
    await mongoClient.close().catch(() => {});
  }
}

export default { syncClanRoles };
