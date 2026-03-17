import fs from "fs/promises";
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";
import options from "../config.js";

loadEnv();

const DB_URL = process.env.DATABASE_URL;
const DB_NAME = "ticketBotDB";
const CLANS_COLLECTION = "clans";
const PENDING_SLOT_ORDERS_COLLECTION = "pending_slot_orders";

const adminsCfgPath = options.adminsCfgPath || "./";

// ────────────────────────────────────────────
// Pricing config
// ────────────────────────────────────────────
// Базовая цена: 2000₽ за 30 слотов на 30 дней
const BASE_SLOTS = 30;
const BASE_PRICE_PER_MONTH = 2000; // ₽

/**
 * Рассчитывает стоимость 30 дней VIP для клана.
 *
 * Оплачиваются только «платные» слоты:
 *   платныхСлотов = slots - bonusSlots
 *   цена/мес = (платныхСлотов / 30) * 2000
 *
 * Поле `bonusSlots` в документе клана в MongoDB — кол-во бесплатных слотов.
 * Если не задано — все слоты платные.
 *
 * Примеры:
 *   { slots: 30, bonusSlots: 0  } → цена = 2000₽/мес
 *   { slots: 50, bonusSlots: 20 } → цена = (30/30)*2000 = 2000₽/мес (платят как за 30)
 *   { slots: 50, bonusSlots: 0  } → цена = (50/30)*2000 = 3333₽/мес
 *   { slots: 60, bonusSlots: 20 } → цена = (40/30)*2000 = 2667₽/мес
 *
 * @param {number} slots      — общее кол-во слотов клана
 * @param {number} bonusSlots — кол-во бесплатных слотов (по умолч. 0)
 * @returns {number} цена за 30 дней
 */
export function getPriceForSlots(slots, bonusSlots = 0) {
  const paidSlots = Math.max(slots - bonusSlots, 1); // минимум 1 платный слот
  return (paidSlots / BASE_SLOTS) * BASE_PRICE_PER_MONTH;
}

/**
 * Рассчитывает кол-во дней VIP за переданную сумму доната.
 * @param {number} sum        — сумма доната в рублях
 * @param {number} slots      — общее кол-во слотов клана
 * @param {number} bonusSlots — кол-во бесплатных слотов (по умолч. 0)
 * @returns {number} дней VIP
 */
export function calcDaysFromDonation(sum, slots, bonusSlots = 0) {
  const pricePerMonth = getPriceForSlots(slots, bonusSlots);
  const months = sum / pricePerMonth;
  return months * 30;
}

// ────────────────────────────────────────────
// MongoDB helpers
// ────────────────────────────────────────────

/**
 * Находит клан по тегу в MongoDB коллекции `clans`.
 * Тег ищется case-insensitive.
 */
export async function findClanByTag(tag) {
  const client = new MongoClient(DB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(CLANS_COLLECTION);

    const clan = await collection.findOne({
      tag: { $regex: new RegExp(`^${escapeRegex(tag)}$`, "i") },
    });

    return clan;
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Проверяет, есть ли для клана ожидающий заказ на увеличение слотов,
 * совпадающий по сумме доната, и если есть — применяет его вместо продления VIP.
 *
 * Ищется документ вида:
 * { clanTag, status: "pending", expiresAt: { $gt: now } }
 * и дополнительно проверяется совпадение expectedAmount === sum.
 *
 * @param {string} tag
 * @param {number} sum
 * @returns {{ matched: boolean, applied?: boolean, clan?: any, order?: any, oldSlots?: number, newSlots?: number, bonusSlots?: number }}
 */
export async function processPendingSlotOrder(tag, sum) {
  const client = new MongoClient(DB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const clansCollection = db.collection(CLANS_COLLECTION);
    const ordersCollection = db.collection(PENDING_SLOT_ORDERS_COLLECTION);

    const now = new Date();

    const clan = await clansCollection.findOne({
      tag: { $regex: new RegExp(`^${escapeRegex(tag)}$`, "i") },
    });

    if (!clan) {
      return { matched: false, applied: false };
    }

    const order = await ordersCollection.findOne({
      clanTag: { $regex: new RegExp(`^${escapeRegex(tag)}$`, "i") },
      status: "pending",
      expiresAt: { $gt: now },
    });

    if (!order) {
      return { matched: false, applied: false, clan };
    }

    const expectedAmount = Number(order.expectedAmount || 0);
    const donationSum = Number(sum || 0);

    if (
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0 ||
      expectedAmount !== donationSum
    ) {
      return {
        matched: true,
        applied: false,
        clan,
        order,
        reason: "AMOUNT_MISMATCH",
      };
    }

    const oldSlots = Number(clan.slots || BASE_SLOTS);
    const extraSlots = Number(order.extraSlots || 0);
    const computedNewTotal = oldSlots + extraSlots;
    const newSlots = Number(order.newTotalSlots || computedNewTotal);

    await clansCollection.updateOne(
      { _id: clan._id },
      {
        $set: {
          slots: newSlots,
          updatedAt: now,
        },
      },
    );

    await ordersCollection.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "completed",
          completedAt: now,
        },
      },
    );

    return {
      matched: true,
      applied: true,
      clan,
      order,
      oldSlots,
      newSlots,
      extraSlots,
      bonusSlots: Number(clan.bonusSlots || 0),
    };
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Обновляет дату истечения VIP для клана в MongoDB.
 * Логика:
 *   - Если expiresAt ещё не прошёл → продлеваем от expiresAt
 *   - Если expiresAt уже прошёл → начинаем от текущей даты
 *
 * @param {string} tag  — тег клана
 * @param {number} sum  — сумма доната в рублях
 * @returns {{ found, clan, oldExpires, newExpires, daysAdded, slots, pricePerMonth, members, discordIds }}
 */
export async function processClanDonation(tag, sum) {
  const client = new MongoClient(DB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(CLANS_COLLECTION);

    const clan = await collection.findOne({
      tag: { $regex: new RegExp(`^${escapeRegex(tag)}$`, "i") },
    });

    if (!clan) {
      return {
        found: false,
        discordIds: [],
        totalMembers: 0,
        newExpires: null,
      };
    }

    const slots = clan.slots || BASE_SLOTS;
    const bonusSlots = clan.bonusSlots || 0;
    const daysToAdd = calcDaysFromDonation(sum, slots, bonusSlots);
    const pricePerMonth = getPriceForSlots(slots, bonusSlots);

    const now = new Date();
    const oldExpires = clan.expiresAt ? new Date(clan.expiresAt) : now;

    // Если VIP ещё активен — продлеваем от даты окончания
    // Если VIP уже истёк — начинаем от текущей даты
    const baseDate = oldExpires > now ? oldExpires : now;
    const newExpires = new Date(
      baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000,
    );

    // Обновляем в MongoDB
    await collection.updateOne(
      { _id: clan._id },
      {
        $set: {
          expiresAt: newExpires,
          updatedAt: now,
        },
      },
    );

    // Собираем discordId из members
    const members = clan.members || [];
    const discordIds = [];
    const steamIds = [];

    for (const member of members) {
      if (member.steamId) {
        steamIds.push(member.steamId);
      }
      if (member.addedBy && typeof member.addedBy === "string") {
        const discordMatch = member.addedBy.match(/^discord:(\d+)$/);
        if (discordMatch) {
          discordIds.push(discordMatch[1]);
        }
      }
    }

    return {
      found: true,
      clan,
      slots,
      pricePerMonth,
      daysAdded: daysToAdd,
      oldExpires,
      newExpires,
      totalMembers: members.length,
      discordIds,
      steamIds,
      isExtension: oldExpires > now,
    };
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Получает все активные кланы (expiresAt > now).
 */
export async function getActiveClans() {
  const client = new MongoClient(DB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(CLANS_COLLECTION);
    const now = new Date();

    return await collection.find({ expiresAt: { $gt: now } }).toArray();
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Получает все кланы с истёкшим VIP.
 */
export async function getExpiredClans() {
  const client = new MongoClient(DB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(CLANS_COLLECTION);
    const now = new Date();

    return await collection.find({ expiresAt: { $lte: now } }).toArray();
  } finally {
    await client.close().catch(() => {});
  }
}

/**
 * Получает все теги кланов из БД (для матчинга доната).
 */
export async function getAllClanTags() {
  const client = new MongoClient(DB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(CLANS_COLLECTION);

    const clans = await collection
      .find({}, { projection: { tag: 1 } })
      .toArray();

    return clans.map((c) => c.tag.toLowerCase());
  } finally {
    await client.close().catch(() => {});
  }
}

// ────────────────────────────────────────────
// Admins.cfg file helpers (для совместимости с игровым сервером)
// ────────────────────────────────────────────

const CLAN_BLOCK_START =
  /^\/\/CLAN \[([^\]\*]+)(\*?)]\s+(\d+)\s+(\d+)\s+do\s+(\d{2}\.\d{2}\.\d{4})$/;
const CLAN_BLOCK_END = /^\s*\/\/END\s*$/;
const MEMBER_LINE =
  /^\s*(?:\/\/\s*)?Admin=(\d+):ClanVip(?:\s*\/\/\s*DiscordID\s*(\d+))?(?:.*?\bdo\s+(\d{2}\.\d{2}\.\d{4}))?\s*$/i;

export async function parseClansFile(path = adminsCfgPath + "Admins.cfg") {
  const data = await fs.readFile(path, "utf-8");
  const lines = data.split(/\r?\n/);

  const clans = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(CLAN_BLOCK_START);

    if (m) {
      if (current) clans.push(current);
      const [, tag, star, allowedCount, clanDiscordId, until] = m;
      current = {
        header: line,
        headerIdx: i,
        lines: [],
        endIdx: null,
        active: star === "",
        tag,
        star: star === "*",
        allowedCount: Number(allowedCount),
        clanDiscordId,
        until,
        members: [],
      };
      continue;
    }

    if (CLAN_BLOCK_END.test(line)) {
      if (current) {
        current.endIdx = i;
        clans.push(current);
        current = null;
      }
      continue;
    }

    if (current) {
      current.lines.push({ value: line, idx: i });

      const mem = line.match(MEMBER_LINE);
      if (mem) {
        current.members.push({
          raw: line,
          commented: line.trim().startsWith("//"),
          steamId: mem[1],
          discordId: mem[2] || null,
          until: mem[3] || null,
          idx: i,
        });
      }
    }
  }

  return { lines, clans };
}

/**
 * Обновляет дату в Admins.cfg для блока клана (для синхронизации с игровым сервером).
 */
export async function updateClanInAdminsCfg(tag, newDateStr) {
  const { lines, clans } = await parseClansFile();
  const clan = clans.find(
    (c) => c.tag.trim().toLowerCase() === tag.trim().toLowerCase(),
  );
  if (!clan) return { updated: false, discordIds: [], totalMembers: 0 };

  // Обновляем header — убираем звёздочку (активируем) и обновляем дату
  let headerLine = clan.header.replace(/\[([^\]\*]+)\*\]/, "[$1]");
  headerLine = headerLine.replace(
    /do\s+\d{2}\.\d{2}\.\d{4}/,
    `do ${newDateStr}`,
  );
  lines[clan.headerIdx] = headerLine;

  // Обновляем даты у всех мемберов и раскомментируем
  for (const m of clan.members) {
    let newVal = m.raw.replace(/^\s*\/\//, "");
    if (/do\s+\d{2}\.\d{2}\.\d{4}/i.test(newVal)) {
      newVal = newVal.replace(/do\s+\d{2}\.\d{2}\.\d{4}/i, `do ${newDateStr}`);
    }
    lines[m.idx] = newVal;
  }

  await fs.writeFile(adminsCfgPath + "Admins.cfg", lines.join("\r\n"), "utf-8");

  const discordIds = clan.members
    .map((m) => m.discordId)
    .filter((id) => typeof id === "string" && id.length > 0);

  return { updated: true, discordIds, totalMembers: clan.members.length };
}

/**
 * «Замораживает» клан в Admins.cfg (ставит звёздочку и комментирует мемберов).
 */
export async function freezeClan(tag) {
  const { lines, clans } = await parseClansFile();
  let clan = clans.find(
    (c) => c.tag.trim().toLowerCase() === tag.trim().toLowerCase(),
  );
  if (!clan) return [];

  let headerLine = clan.header.replace(/\[([^\]\*]+)]/, "[$1*]");
  lines[clan.headerIdx] = headerLine;

  for (const m of clan.members) {
    if (!m.raw.trim().startsWith("//")) lines[m.idx] = "//" + m.raw;
  }

  await fs.writeFile(adminsCfgPath + "Admins.cfg", lines.join("\r\n"), "utf-8");

  return clan.members
    .map((m) => m.discordId)
    .filter((id) => typeof id === "string" && id.length > 0);
}

export async function getClanMemberDiscordIds(tag) {
  const { clans } = await parseClansFile();
  let clan = clans.find(
    (c) => c.tag.trim().toLowerCase() === tag.trim().toLowerCase(),
  );
  if (!clan) return [];

  return clan.members
    .map((m) => m.discordId)
    .filter((id) => typeof id === "string" && id.length > 0);
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatDateRu(date) {
  return date
    .toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, ".");
}

export async function triggerAdminsCfgRegen() {
  const SITE_API_URL = process.env.SITE_API_URL || "http://localhost:5000";
  const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
  try {
    const res = await fetch(`${SITE_API_URL}/internal/regenerate-admins-cfg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": INTERNAL_API_KEY,
      },
    });
    if (!res.ok) {
      console.error(`[clanVipManager] Regen API failed: ${res.status}`);
      return false;
    }
    console.log("[clanVipManager] admins.cfg regenerated via API");
    return true;
  } catch (e) {
    console.error("[clanVipManager] Regen API error:", e.message);
    return false;
  }
}

export default {
  findClanByTag,
  processPendingSlotOrder,
  processClanDonation,
  getActiveClans,
  getExpiredClans,
  getAllClanTags,
  getPriceForSlots,
  calcDaysFromDonation,
  formatDateRu,
  // Admins.cfg compatibility
  parseClansFile,
  updateClanInAdminsCfg,
  freezeClan,
  getClanMemberDiscordIds,
};
