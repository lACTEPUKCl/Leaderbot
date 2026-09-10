import { Routes } from "discord.js";

export const WARDOGS = Object.freeze({
  channelId: "760087819967922197",
  messageId: "1547643000765546696",
  roleId: "1540427999885656088",
  emojiName: "wardogs",
  intervalMs: 60_000,
});

const jobs = new WeakMap();

export async function syncWardogsRole(client, logger = console) {
  const { channelId, messageId, roleId, emojiName } = WARDOGS;
  const channel = await client.channels.fetch(channelId);
  if (!channel?.guild) throw new Error("Wardogs channel is not a guild channel");
  const guild = channel.guild;
  const role = await guild.roles.fetch(roleId);
  if (!role?.editable) throw new Error("Wardogs role is missing or not manageable by the bot");

  // Read REST snapshots, never a potentially stale message/reaction-user cache.
  const message = await client.rest.get(Routes.channelMessage(channelId, messageId));
  const reactors = new Set();
  for (const reaction of message.reactions ?? []) {
    if (!reaction.emoji.id || reaction.emoji.name !== emojiName) continue;
    const emoji = `${reaction.emoji.name}:${reaction.emoji.id}`;
    // Both ordinary reactions and Super Reactions qualify.
    const types = reaction.count_details?.burst > 0 ? [0, 1] : [0];
    for (const type of types) {
      let after;
      while (true) {
        const query = new URLSearchParams({ limit: "100", type: String(type) });
        if (after) query.set("after", after);
        const users = await client.rest.get(
          Routes.channelMessageReaction(channelId, messageId, emoji),
          { query },
        );
        for (const user of users) reactors.add(user.id);
        if (users.length < 100) break;
        const next = users[users.length - 1].id;
        if (after && BigInt(next) <= BigInt(after)) {
          throw new Error("Wardogs reaction pagination did not advance");
        }
        after = next;
      }
    }
  }

  // A failed/incomplete fetch must abort before any role changes.
  const members = await guild.members.fetch();
  const result = { added: 0, removed: 0, failed: 0 };
  for (const member of members.values()) {
    const wanted = reactors.has(member.id);
    if (member.roles.cache.has(roleId) === wanted) continue;
    try {
      if (wanted) {
        await member.roles.add(roleId, "Wardogs message reaction sync");
        result.added++;
      } else {
        await member.roles.remove(roleId, "Wardogs message reaction removed");
        result.removed++;
      }
    } catch (error) {
      result.failed++;
      logger.error(`[wardogsRoleSync] ${wanted ? "add" : "remove"} ${member.id}:`, error.message);
    }
  }
  if (result.added || result.removed || result.failed) {
    logger.log("[wardogsRoleSync]", result);
  }
  return result;
}

export function startWardogsRoleSync(client, logger = console) {
  if (jobs.has(client)) return jobs.get(client);
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncWardogsRole(client, logger);
    } catch (error) {
      logger.error("[wardogsRoleSync] Sync failed:", error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, WARDOGS.intervalMs);
  timer.unref?.();
  jobs.set(client, timer);
  void run();
  return timer;
}
