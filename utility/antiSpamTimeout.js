import { ChannelType, PermissionFlagsBits } from "discord.js";

export function registerAntiSpamTimeout(
  client,
  logChannelId,
  notifyUserId,
  duplicateThresholdSingleChannel = 3,
  windowMs = 90 * 1000,
  timeoutMs = 24 * 60 * 60 * 1000
) {
  const userRecent = new Map();
  const punishedUntil = new Map();

  const MAX_PER_USER = 50;
  const GC_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of userRecent) {
      const fresh = arr.filter((r) => now - r.timestamp <= windowMs);
      if (fresh.length) userRecent.set(k, fresh.slice(-MAX_PER_USER));
      else userRecent.delete(k);
    }
    for (const [k, t] of punishedUntil) if (now >= t) punishedUntil.delete(k);
  }, GC_INTERVAL_MS).unref?.();

  client.on("messageCreate", async (message) => {
    try {
      if (!message.guild || message.author.bot || !message.member) return;
      if (message.member.permissions.has(PermissionFlagsBits.Administrator))
        return;

      const key = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();
      const until = punishedUntil.get(key);
      if (until && now < until) return;

      const hash = makeHash(message);
      const recs = userRecent.get(key) ?? [];
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
      if (same.length < 2) return;

      const perChannel = new Map();
      for (const r of same)
        perChannel.set(r.channelId, (perChannel.get(r.channelId) || 0) + 1);
      const distinctChannels = perChannel.size;
      const maxInOneChannel = Math.max(...perChannel.values());
      const crossChannelTrigger = distinctChannels >= 3;
      const singleChannelTrigger =
        maxInOneChannel >= duplicateThresholdSingleChannel;

      if (crossChannelTrigger || singleChannelTrigger) {
        await deleteMessages(message.guild, same);
        const ok = await timeoutMember(
          message.guild,
          message.member,
          timeoutMs
        );
        if (!ok) {
          await notify(
            message.guild,
            logChannelId,
            `Не удалось выдать таймаут <@${message.author.id}>. Проверьте право Moderate Members и позицию роли бота.`
          );
          userRecent.set(key, []);
          return;
        }
        punishedUntil.set(key, now + timeoutMs);
        userRecent.set(key, []);
        await notify(
          message.guild,
          logChannelId,
          `<@${message.author.id}> ограничен(а) на ${toHuman(
            timeoutMs
          )} за рассылку одинаковых сообщений (${distinctChannels} каналов, макс в одном канале: ${maxInOneChannel}). <@${notifyUserId}>`
        );
      }
    } catch (e) {
      console.error("[antiSpamTimeout]", e);
    }
  });
}

function makeHash(message) {
  const content = (message.content || "").trim();
  const attachments = Array.from(message.attachments.values())
    .map((a) => a.url || a.proxyURL || a.name || "")
    .filter(Boolean)
    .sort()
    .join("|");
  return `${content}||${attachments}`;
}

async function deleteMessages(guild, list) {
  const map = new Map();
  for (const r of list)
    (map.get(r.channelId) ?? map.set(r.channelId, []).get(r.channelId)).push(
      r.messageId
    );
  for (const [channelId, ids] of map) {
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
    } else {
      const anyCh = ch;
      for (const mid of ids) {
        try {
          const m = await anyCh.messages.fetch(mid).catch(() => null);
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
    await member.timeout(timeoutMs, "AntiSpam: duplicate spam across channels");
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
  const h = Math.floor(ms / 3_600_000),
    m = Math.floor((ms % 3_600_000) / 60_000);
  if (h && m) return `${h}ч ${m}м`;
  if (h) return `${h}ч`;
  if (m) return `${м}м`;
  return `${Math.floor(ms / 1000)}с`;
}
