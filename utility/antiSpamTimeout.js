import { ChannelType, PermissionFlagsBits } from "discord.js";

const DEFAULT_CONFIG = {
  enabled: true,

  // окно, в котором считаем повторы
  windowMs: 10_000,

  // таймаут по умолчанию
  timeoutMs: 24 * 60 * 60 * 1000,

  // минимум одинаковых сообщений (по hash), чтобы вообще начинать проверку
  minSameToCheck: 3,

  // канал логов и кого тегать (можно переопределить в options.antiSpam)
  logChannelId: null,
  notifyUserId: null,

  // чистка памяти
  gc: {
    maxPerUser: 50,
    intervalMs: 10 * 60 * 1000,
  },

  // Сообщения "только вложение/стикер, без текста"
  attachmentOnly: {
    enabled: true,
    punishMode: "delete_only", // "delete_only" | "timeout"
    duplicateThresholdSingleChannel: 6,
    crossChannelDistinctMin: 4,
    crossChannelSameMin: 4,
    punishedCooldownMs: 10_000,
  },

  // Подозрительные
  suspicious: {
    duplicateThresholdSingleChannel: 2,
    crossChannelDistinctMin: 2,
    crossChannelSameMin: 2,
  },

  // Обычные
  normal: {
    duplicateThresholdSingleChannel: 3,
    shortLenMax: 8,
    shortLenBoost: 2,
    crossChannelDistinctMin: 3,
    crossChannelSameMin: 3,
  },

  // не трогать админов
  ignoreAdmins: true,
};

function mergeConfig(userCfg) {
  const cfg = userCfg && typeof userCfg === "object" ? userCfg : {};
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    gc: { ...DEFAULT_CONFIG.gc, ...(cfg.gc || {}) },
    attachmentOnly: {
      ...DEFAULT_CONFIG.attachmentOnly,
      ...(cfg.attachmentOnly || {}),
    },
    suspicious: { ...DEFAULT_CONFIG.suspicious, ...(cfg.suspicious || {}) },
    normal: { ...DEFAULT_CONFIG.normal, ...(cfg.normal || {}) },
  };
}

export function registerAntiSpamTimeout(client, options) {
  const config = mergeConfig(options?.antiSpam);

  if (!config.enabled) return;

  const logChannelId = config.logChannelId;
  const notifyUserId = config.notifyUserId;

  const userRecent = new Map();
  const punishedUntil = new Map();

  const MAX_PER_USER = config.gc.maxPerUser ?? 50;
  const GC_INTERVAL_MS = config.gc.intervalMs ?? 10 * 60 * 1000;

  setInterval(() => {
    const now = Date.now();
    const windowMs = config.windowMs ?? 10_000;

    for (const [k, arr] of userRecent) {
      const fresh = arr.filter((r) => now - r.timestamp <= windowMs);
      if (fresh.length) userRecent.set(k, fresh.slice(-MAX_PER_USER));
      else userRecent.delete(k);
    }

    for (const [k, t] of punishedUntil) {
      if (now >= t) punishedUntil.delete(k);
    }
  }, GC_INTERVAL_MS).unref?.();

  client.on("messageCreate", async (message) => {
    try {
      if (!message.guild || message.author?.bot || !message.member) return;

      if (config.ignoreAdmins) {
        if (message.member.permissions.has(PermissionFlagsBits.Administrator))
          return;
      }

      if (isTrivialMessage(message)) return;

      const key = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();

      const until = punishedUntil.get(key);
      if (until && now < until) return;

      const analysis = analyzeMessage(message);

      const isSuspicious =
        analysis.hasLink ||
        analysis.hasInvite ||
        analysis.hasEveryoneMention ||
        analysis.hasSuspiciousKeywords;

      const hash = makeHash(message);
      const recs = userRecent.get(key) ?? [];

      const windowMs = config.windowMs ?? 10_000;
      const fresh = recs.filter((r) => now - r.timestamp <= windowMs);

      fresh.push({
        hash,
        timestamp: now,
        messageId: message.id,
        channelId: message.channel.id,
      });

      userRecent.set(
        key,
        fresh.length > MAX_PER_USER ? fresh.slice(-MAX_PER_USER) : fresh
      );

      const same = fresh.filter((r) => r.hash === hash);

      const minSameToCheck = config.minSameToCheck ?? 3;
      if (same.length < minSameToCheck) return;

      const perChannel = new Map();
      for (const r of same) {
        perChannel.set(r.channelId, (perChannel.get(r.channelId) || 0) + 1);
      }

      const distinctChannels = perChannel.size;
      const maxInOneChannel = Math.max(...perChannel.values());

      let crossChannelTrigger = false;
      let singleChannelTrigger = false;

      if (
        config.attachmentOnly?.enabled &&
        analysis.attachmentOnly &&
        !isSuspicious
      ) {
        const a = config.attachmentOnly;

        crossChannelTrigger =
          distinctChannels >= (a.crossChannelDistinctMin ?? 4) &&
          same.length >= (a.crossChannelSameMin ?? 4);

        singleChannelTrigger =
          maxInOneChannel >= (a.duplicateThresholdSingleChannel ?? 6);
      } else if (isSuspicious) {
        const s = config.suspicious;

        crossChannelTrigger =
          distinctChannels >= (s.crossChannelDistinctMin ?? 2) &&
          same.length >= (s.crossChannelSameMin ?? 2);

        singleChannelTrigger =
          maxInOneChannel >= (s.duplicateThresholdSingleChannel ?? 2);
      } else {
        const n = config.normal;

        const shortBoost =
          analysis.length <= (n.shortLenMax ?? 8) ? n.shortLenBoost ?? 2 : 0;

        const threshold = (n.duplicateThresholdSingleChannel ?? 3) + shortBoost;

        crossChannelTrigger =
          distinctChannels >= (n.crossChannelDistinctMin ?? 3) &&
          same.length >= (n.crossChannelSameMin ?? 3);

        singleChannelTrigger = maxInOneChannel >= threshold;
      }

      if (!crossChannelTrigger && !singleChannelTrigger) return;

      await deleteMessages(message.guild, same);

      if (
        config.attachmentOnly?.enabled &&
        analysis.attachmentOnly &&
        !isSuspicious
      ) {
        const mode = config.attachmentOnly?.punishMode ?? "delete_only";

        userRecent.set(key, []);

        if (mode === "delete_only") {
          const cd = config.attachmentOnly?.punishedCooldownMs ?? 10_000;
          punishedUntil.set(key, now + cd);

          if (logChannelId) {
            await notify(
              message.guild,
              logChannelId,
              `<@${message.author.id}> удалены повторяющиеся вложения (без таймаута).` +
                (notifyUserId ? ` <@${notifyUserId}>` : "")
            );
          }
          return;
        }
      }

      const timeoutMs = config.timeoutMs ?? 24 * 60 * 60 * 1000;
      const ok = await timeoutMember(message.guild, message.member, timeoutMs);

      if (!ok) {
        if (logChannelId) {
          await notify(
            message.guild,
            logChannelId,
            `Не удалось выдать таймаут <@${message.author.id}>. Проверьте право Moderate Members и позицию роли бота.` +
              (notifyUserId ? ` <@${notifyUserId}>` : "")
          );
        }
        userRecent.set(key, []);
        return;
      }

      punishedUntil.set(key, now + timeoutMs);
      userRecent.set(key, []);

      if (logChannelId) {
        await notify(
          message.guild,
          logChannelId,
          `<@${message.author.id}> ограничен(а) на ${toHuman(
            timeoutMs
          )} за рассылку одинаковых сообщений ` +
            `(${distinctChannels} каналов, макс в одном канале: ${maxInOneChannel}).` +
            (notifyUserId ? ` <@${notifyUserId}>` : "")
        );
      }
    } catch (e) {
      console.error("[antiSpamTimeout]", e);
    }
  });
}

function isTrivialMessage(message) {
  const content = (message.content || "").trim();
  const hasAttachments = (message.attachments?.size || 0) > 0;
  const hasStickers = (message.stickers?.size || 0) > 0;

  if (!content && !hasAttachments && !hasStickers) return true;
  if (hasAttachments || hasStickers) return false;

  const hasLink =
    /\bhttps?:\/\//i.test(content) ||
    /discord\.gg/i.test(content) ||
    /t\.me\//i.test(content);

  const hasEveryoneMention = /@everyone|@here/.test(content);
  const hasInvite = /discord\.gg\/[A-Za-z0-9]+/i.test(content);

  if (hasLink || hasEveryoneMention || hasInvite) return false;

  const noSpace = content.replace(/\s+/g, "");
  if (!noSpace) return true;

  if (noSpace.length <= 3) return true;

  const uniqueChars = new Set(noSpace.toLowerCase()).size;
  if (noSpace.length <= 10 && uniqueChars <= 2) return true;

  return false;
}

function analyzeMessage(message) {
  const raw = (message.content || "").trim();
  const content = raw.toLowerCase();
  const noSpace = content.replace(/\s+/g, "");

  const hasAttachments = (message.attachments?.size || 0) > 0;
  const hasStickers = (message.stickers?.size || 0) > 0;

  const attachmentOnly = !noSpace && (hasAttachments || hasStickers);

  const hasLink =
    /\bhttps?:\/\//i.test(content) || /discord\.gg/i.test(content);
  const hasInvite = /discord\.gg\/[a-z0-9]+/i.test(content);
  const hasEveryoneMention = /@everyone|@here/.test(content);

  const hasSuspiciousKeywords =
    /nitro|steam|скидк|розыгрыш|giveaway|crypto|крипт|биткоин|bitcoin/i.test(
      content
    );

  return {
    length: noSpace.length,
    hasAttachments,
    hasStickers,
    attachmentOnly,
    hasLink,
    hasInvite,
    hasEveryoneMention,
    hasSuspiciousKeywords,
  };
}

function makeHash(message) {
  const text = (message.content || "").trim();

  const attachments = Array.from(message.attachments?.values?.() || [])
    .map((a) => a.url || a.proxyURL || a.name || "")
    .filter(Boolean)
    .sort()
    .join("|");

  const stickers = Array.from(message.stickers?.values?.() || [])
    .map((s) => `sticker:${s.id}`)
    .sort()
    .join("|");

  return `${text}||${attachments}||${stickers}`;
}

async function deleteMessages(guild, list) {
  const byChannel = new Map();

  for (const r of list) {
    const arr = byChannel.get(r.channelId) || [];
    arr.push(r.messageId);
    byChannel.set(r.channelId, arr);
  }

  for (const [channelId, ids] of byChannel) {
    const ch = guild.channels.cache.get(channelId);
    if (!ch) continue;

    if (ch.type === ChannelType.GuildText) {
      const queue = ids.slice();
      while (queue.length) {
        const chunk = queue.splice(0, 100);

        try {
          await ch.bulkDelete(chunk, true).catch(async () => {
            for (const mid of chunk) {
              try {
                const m = await ch.messages.fetch(mid).catch(() => null);
                if (m) await m.delete().catch(() => null);
              } catch {}
            }
          });
        } catch {}
      }
      continue;
    }

    if (typeof ch.messages?.fetch === "function") {
      for (const mid of ids) {
        try {
          const m = await ch.messages.fetch(mid).catch(() => null);
          if (m) await m.delete().catch(() => null);
        } catch {}
      }
    }
  }
}

async function timeoutMember(guild, member, timeoutMs) {
  try {
    const me = await guild.members.fetchMe();

    const canTimeout =
      me.permissions.has(PermissionFlagsBits.ModerateMembers) &&
      me.roles.highest.position > member.roles.highest.position;

    if (!canTimeout) return false;

    await member.timeout(timeoutMs, "AntiSpam: duplicate spam");
    return true;
  } catch {
    return false;
  }
}

async function notify(guild, channelId, content) {
  try {
    const ch = await guild.channels.fetch(channelId);
    if (ch && ch.isTextBased()) await ch.send({ content }).catch(() => null);
  } catch {}
}

function toHuman(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  if (m) return `${m}м`;
  return `${Math.floor(ms / 1000)}с`;
}
