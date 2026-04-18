import { ChannelType, PermissionFlagsBits } from "discord.js";

export function isTrivialMessage(message) {
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

export function analyzeMessage(message) {
  const raw = (message.content || "").trim();
  const content = raw.toLowerCase();
  const noSpace = content.replace(/\s+/g, "");

  const hasAttachments = (message.attachments?.size || 0) > 0;
  const hasStickers = (message.stickers?.size || 0) > 0;
  const attachmentOnly = !noSpace && (hasAttachments || hasStickers);

  const hasLink =
    /\bhttps?:\/\//i.test(content) ||
    /discord\.gg/i.test(content) ||
    /t\.me\//i.test(content);
  const hasInvite =
    /discord\.gg\/[a-z0-9]+/i.test(content) ||
    /t\.me\/[a-z0-9_]+/i.test(content);
  const hasEveryoneMention = /@everyone|@here/.test(content);

  const hasSuspiciousKeywords =
    /nitro|steam|giveaway|crypto|bitcoin|nft|airdrop|free\s*nitro/i.test(
      content
    ) ||
    /\u0441\u043a\u0438\u0434\u043a|\u0440\u043e\u0437\u044b\u0433\u0440\u044b\u0448|\u043a\u0440\u0438\u043f\u0442|\u0431\u0438\u0442\u043a\u043e\u0438\u043d|\u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d/i.test(
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

function normalizeText(raw) {
  const CYR = {
    "\u0430": "a",
    "\u0435": "e",
    "\u043e": "o",
    "\u0440": "p",
    "\u0441": "c",
    "\u0443": "y",
    "\u0445": "x",
  };
  return raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, "<LINK>")
    .replace(/discord\.gg\/\S+/gi, "<INVITE>")
    .replace(/t\.me\/\S+/gi, "<INVITE>")
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u2060\u2063]/g, "")
    .replace(
      /[\u0430\u0435\u043e\u0440\u0441\u0443\u0445]/g,
      (c) => CYR[c] || c
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function makeHash(message, analysis) {
  const text = normalizeText((message.content || "").trim());
  const attachments = Array.from(message.attachments?.values?.() || []);
  const stickers = Array.from(message.stickers?.values?.() || []);

  if (analysis && analysis.attachmentOnly) {
    const aSig = attachments
      .map(
        (a) =>
          (a.contentType || "").split(";")[0] +
          "|" +
          (a.width || 0) +
          "x" +
          (a.height || 0)
      )
      .sort()
      .join("|");
    const sSig = stickers
      .map((s) => "sticker:" + s.id)
      .sort()
      .join("|");
    return (
      "ATTACHMENT_ONLY||count:" +
      attachments.length +
      "||" +
      aSig +
      "||" +
      sSig
    );
  }

  const aSig = attachments
    .map(
      (a) =>
        (a.name || "") +
        "|" +
        (a.size || 0) +
        "|" +
        (a.contentType || "") +
        "|" +
        (a.width || 0) +
        "x" +
        (a.height || 0)
    )
    .filter(Boolean)
    .sort()
    .join("|");
  const sSig = stickers
    .map((s) => "sticker:" + s.id)
    .sort()
    .join("|");
  return text + "||" + aSig + "||" + sSig;
}

export async function deleteMessages(guild, list) {
  const byChannel = new Map();
  for (const r of list) {
    const arr = byChannel.get(r.channelId) || [];
    arr.push(r.messageId);
    byChannel.set(r.channelId, arr);
  }

  for (const [channelId, ids] of byChannel) {
    const uniqueIds = [...new Set(ids)];
    const ch = guild.channels.cache.get(channelId);
    if (!ch) continue;

    if (ch.type === ChannelType.GuildText) {
      const queue = uniqueIds.slice();
      while (queue.length) {
        const chunk = queue.splice(0, 100);
        try {
          await ch.bulkDelete(chunk, true).catch(async () => {
            for (const mid of chunk) {
              try {
                const m = await ch.messages.fetch(mid).catch(() => null);
                if (m) await m.delete().catch(() => null);
              } catch (_) {
                /* ignore */
              }
            }
          });
        } catch (_) {
          /* ignore */
        }
      }
      continue;
    }

    if (typeof ch.messages?.fetch === "function") {
      for (const mid of uniqueIds) {
        try {
          const m = await ch.messages.fetch(mid).catch(() => null);
          if (m) await m.delete().catch(() => null);
        } catch (_) {
          /* ignore */
        }
      }
    }
  }
}

export async function timeoutMember(guild, member, timeoutMs) {
  try {
    const me = await guild.members.fetchMe();
    const canTimeout =
      me.permissions.has(PermissionFlagsBits.ModerateMembers) &&
      me.roles.highest.position > member.roles.highest.position;
    if (!canTimeout) return false;
    await member.timeout(timeoutMs, "AntiSpam: spam detected");
    return true;
  } catch (_) {
    return false;
  }
}

export async function notify(guild, channelId, content) {
  try {
    const ch = await guild.channels.fetch(channelId);
    if (ch && ch.isTextBased()) await ch.send({ content }).catch(() => null);
  } catch (_) {
    /* ignore */
  }
}

export function toHuman(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h && m) return h + "h " + m + "m";
  if (h) return h + "h";
  if (m) return m + "m";
  return Math.floor(ms / 1000) + "s";
}
