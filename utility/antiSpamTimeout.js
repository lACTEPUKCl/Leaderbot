import { PermissionFlagsBits } from "discord.js";
import {
  isTrivialMessage,
  analyzeMessage,
  makeHash,
  deleteMessages,
  timeoutMember,
  notify,
  toHuman,
} from "./antiSpamHelpers.js";

const DEFAULT_CONFIG = {
  enabled: true,
  windowMs: 30000,
  timeoutMs: 24 * 60 * 60 * 1000,
  logChannelId: null,
  notifyUserId: null,
  ignoreAdmins: true,
  debounceMs: 300,
  debounceMaxMs: 2000,
  scoring: {
    deleteThreshold: 10,
    timeoutThreshold: 14,
    duplicateMessage: 3,
    crossChannel: 4,
    suspiciousContent: 5,
    suspiciousKeywords: 4,
    newMemberRecent: 6,
    newMemberDay: 3,
    rateFlood: 8,
  },
  rateLimiter: {
    maxMessages: 5,
    crossChannelMin: 3,
  },
  gc: {
    maxPerUser: 100,
    intervalMs: 5 * 60 * 1000,
  },
};

function mergeConfig(userCfg) {
  const cfg = userCfg && typeof userCfg === "object" ? userCfg : {};
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    scoring: { ...DEFAULT_CONFIG.scoring, ...(cfg.scoring || {}) },
    rateLimiter: {
      ...DEFAULT_CONFIG.rateLimiter,
      ...(cfg.rateLimiter || {}),
    },
    gc: { ...DEFAULT_CONFIG.gc, ...(cfg.gc || {}) },
  };
}

export function registerAntiSpamTimeout(client, options) {
  const config = mergeConfig(options?.antiSpam);
  if (!config.enabled) return;

  const { logChannelId, notifyUserId } = config;
  const sc = config.scoring;
  const rl = config.rateLimiter;

  const userMessages = new Map();
  const userAllRecent = new Map();
  const ALL_WINDOW_MS = 60000;
  const ALL_MAX = 300;
  const punishedUntil = new Map();
  const analysisTimers = new Map();
  const MAX_PER_USER = config.gc.maxPerUser ?? 100;

  // -- GC --
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of userMessages) {
      const fresh = arr.filter(
        (r) => now - r.timestamp <= config.windowMs
      );
      if (fresh.length)
        userMessages.set(k, fresh.slice(-MAX_PER_USER));
      else userMessages.delete(k);
    }
    for (const [k, arr] of userAllRecent) {
      const fresh = arr.filter(
        (r) => now - r.timestamp <= ALL_WINDOW_MS
      );
      if (fresh.length)
        userAllRecent.set(k, fresh.slice(-ALL_MAX));
      else userAllRecent.delete(k);
    }
    for (const [k, t] of punishedUntil) {
      if (now >= t) punishedUntil.delete(k);
    }
  }, config.gc.intervalMs).unref?.();

  // -- Scoring engine --
  function calculateScore(messages, member) {
    let score = 0;
    const details = [];

    const hashCounts = new Map();
    for (const m of messages) {
      hashCounts.set(m.hash, (hashCounts.get(m.hash) || 0) + 1);
    }
    const maxDupes = Math.max(...hashCounts.values(), 0);
    if (maxDupes >= 2) {
      const pts = (maxDupes - 1) * sc.duplicateMessage;
      score += pts;
      details.push("dupes x" + maxDupes + " (+" + pts + ")");
    }

    const channels = new Set(messages.map((m) => m.channelId));
    if (channels.size >= 2) {
      const pts = (channels.size - 1) * sc.crossChannel;
      score += pts;
      details.push(channels.size + " ch (+" + pts + ")");
    }

    const anySusp = messages.some(
      (m) =>
        m.analysis.hasLink ||
        m.analysis.hasInvite ||
        m.analysis.hasEveryoneMention
    );
    if (anySusp) {
      score += sc.suspiciousContent;
      details.push("links/invite (+" + sc.suspiciousContent + ")");
    }

    if (messages.some((m) => m.analysis.hasSuspiciousKeywords)) {
      score += sc.suspiciousKeywords;
      details.push("keywords (+" + sc.suspiciousKeywords + ")");
    }

    const joinedMs = member.joinedAt
      ? Date.now() - member.joinedAt.getTime()
      : Infinity;
    if (joinedMs < 3600000) {
      score += sc.newMemberRecent;
      details.push("new <1h (+" + sc.newMemberRecent + ")");
    } else if (joinedMs < 86400000) {
      score += sc.newMemberDay;
      details.push("new <24h (+" + sc.newMemberDay + ")");
    }

    if (
      messages.length >= rl.maxMessages &&
      channels.size >= rl.crossChannelMin
    ) {
      score += sc.rateFlood;
      details.push("flood (+" + sc.rateFlood + ")");
    }

    return { score, details };
  }

  // -- Run analysis --
  async function runAnalysis(key, guild, member) {
    const now = Date.now();
    const msgs = (userMessages.get(key) || []).filter(
      (r) => now - r.timestamp <= config.windowMs
    );
    if (msgs.length === 0) return;

    const { score, details } = calculateScore(msgs, member);
    if (score < sc.deleteThreshold) return;

    const shouldTimeout = score >= sc.timeoutThreshold;
    const cooldownMs = shouldTimeout ? config.timeoutMs : 60000;
    punishedUntil.set(key, now + cooldownMs);

    const allDel = userAllRecent.get(key) || [];
    const seen = new Set();
    const unique = [...msgs, ...allDel].filter((m) => {
      if (seen.has(m.messageId)) return false;
      seen.add(m.messageId);
      return true;
    });
    await deleteMessages(guild, unique);

    const tailDelays = [500, 1500, 3000, 6000];
    for (let i = 0; i < tailDelays.length; i++) {
      const t = setTimeout(async () => {
        try {
          const more = userAllRecent.get(key) || [];
          if (more.length) await deleteMessages(guild, more);
        } catch (_) {}
      }, tailDelays[i]);
      if (t.unref) t.unref();
    }

    userMessages.set(key, []);

    const tag = "<@" + member.id + ">";
    const scoreLog =
      "Score: **" +
      score +
      "** / " +
      (shouldTimeout ? sc.timeoutThreshold : sc.deleteThreshold) +
      " | " +
      details.join(", ");
    const ping = notifyUserId ? "\n<@" + notifyUserId + ">" : "";

    if (shouldTimeout) {
      const ok = await timeoutMember(guild, member, config.timeoutMs);
      if (logChannelId) {
        const txt = ok
          ? tag +
            " restricted for **" +
            toHuman(config.timeoutMs) +
            "**.\n" +
            scoreLog +
            ping
          : "Failed to timeout " +
            tag +
            ". Check perms.\n" +
            scoreLog +
            ping;
        await notify(guild, logChannelId, txt);
      }
    } else if (logChannelId) {
      await notify(
        guild,
        logChannelId,
        tag + " msgs deleted (no timeout).\n" + scoreLog + ping
      );
    }
  }

  // -- Debounce scheduler --
  function scheduleAnalysis(key, guild, member, analysis) {
    const existing = analysisTimers.get(key);

    const joinedMs = member.joinedAt
      ? Date.now() - member.joinedAt.getTime()
      : Infinity;
    const isNew = joinedMs < 3600000;
    const isSusp =
      analysis.hasLink ||
      analysis.hasInvite ||
      analysis.hasEveryoneMention ||
      analysis.hasSuspiciousKeywords;

    let delay = config.debounceMs;
    if (isSusp && isNew) delay = 50;
    else if (isSusp) delay = 150;

    if (existing) {
      const elapsed = Date.now() - existing.firstSeen;
      if (elapsed >= config.debounceMaxMs) {
        clearTimeout(existing.timer);
        analysisTimers.delete(key);
        runAnalysis(key, guild, member);
        return;
      }
      clearTimeout(existing.timer);
    }

    const firstSeen = existing ? existing.firstSeen : Date.now();
    const timer = setTimeout(() => {
      analysisTimers.delete(key);
      runAnalysis(key, guild, member);
    }, delay);
    if (timer.unref) timer.unref();

    analysisTimers.set(key, { timer, guild, member, firstSeen });
  }

  // -- Message handler --
  client.on("messageCreate", async (message) => {
    const now = Date.now();
    try {
      if (!message.guild || !message.author || message.author.bot)
        return;

      const member =
        message.member ||
        (await message.guild.members
          .fetch(message.author.id)
          .catch(() => null));
      if (!member) return;

      if (config.ignoreAdmins) {
        if (
          member.permissions.has(PermissionFlagsBits.Administrator)
        )
          return;
      }

      if (isTrivialMessage(message)) return;

      const key = message.guild.id + ":" + message.author.id;

      // Always add to deletion buffer
      {
        const all = userAllRecent.get(key) || [];
        const fresh = all.filter(
          (r) => now - r.timestamp <= ALL_WINDOW_MS
        );
        fresh.push({
          timestamp: now,
          messageId: message.id,
          channelId: message.channel.id,
        });
        userAllRecent.set(
          key,
          fresh.length > ALL_MAX ? fresh.slice(-ALL_MAX) : fresh
        );
      }

      // If punished - delete immediately
      const until = punishedUntil.get(key);
      if (until && now < until) {
        await message.delete().catch(() => null);
        return;
      }

      // Analyze + detection buffer
      const analysis = analyzeMessage(message);
      const hash = makeHash(message, analysis);
      {
        const recs = userMessages.get(key) || [];
        const fresh = recs.filter(
          (r) => now - r.timestamp <= config.windowMs
        );
        fresh.push({
          hash,
          timestamp: now,
          messageId: message.id,
          channelId: message.channel.id,
          analysis,
        });
        userMessages.set(
          key,
          fresh.length > MAX_PER_USER
            ? fresh.slice(-MAX_PER_USER)
            : fresh
        );
      }

      // Schedule debounced analysis
      scheduleAnalysis(key, message.guild, member, analysis);
    } catch (e) {
      console.error("[antiSpam]", e);
    }
  });
}
