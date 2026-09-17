import { EmbedBuilder } from 'discord.js';
import { MongoClient } from 'mongodb';
import options from '../config.js';
import 'dotenv/config';

const client = new MongoClient(process.env.DATABASE_URL);
let busy = false;
let notifiedTarget = null;
let timer;

// Site and Companion use this same target; never choose one independently.
async function seedingServers(guild) {
  if (busy || !guild) return;
  busy = true;
  try {
    await client.connect();
    const collection = client.db(options.dbName).collection('seeders');
    const target = await collection.findOne({ _id: '__target' });
    const age = Date.now() - new Date(target?.updatedAt || 0).getTime();
    if (!target?.active || age < 0 || age > 90000) return;
    const notificationKey = `${new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10)}:${target.serverKey}`;
    if (notifiedTarget === notificationKey) return;
    const previous = await collection.findOne({ _id: '__discordNotification' });
    if (previous?.key === notificationKey) { notifiedTarget = notificationKey; return; }
    const role = await guild.roles.fetch(options.seedRoleId);
    if (!role) return;
    // REST pagination avoids Gateway opcode 8 contention with role/VIP workers.
    const recipients = new Map();
    let after;
    for (;;) {
      const page = await guild.members.list({ limit: 1000, ...(after ? { after } : {}) });
      for (const member of page.values()) {
        if (member.roles.cache.has(options.seedRoleId)) recipients.set(member.id, member);
      }
      if (page.size < 1000) break;
      const next = page.lastKey();
      if (!next || next === after) throw new Error('member pagination did not advance');
      after = next;
    }
    const embed = new EmbedBuilder().setColor('#0099ff')
      .setTitle(target.name || target.serverKey)
      .setURL('https://rnserver.ru/seed')
      .setDescription('Сидим этот сервер вместе с компаньоном. Подключиться: https://rnserver.ru/seed\nЗа присутствие на целевом сервере с ролью сидера или включённым набором — 5 бонусов в минуту.')
      .addFields({ name: 'Отписаться', value: 'Снимите роль сидера в канале получения роли.' });
    // Persist before sending: restart must not duplicate a mass notification.
    await collection.updateOne({ _id: '__discordNotification' }, { $set: { key: notificationKey, serverKey: target.serverKey, updatedAt: new Date() } }, { upsert: true });
    notifiedTarget = notificationKey;
    let delivered = 0;
    for (const member of recipients.values()) {
      await member.send({ embeds: [embed] }).then(() => delivered++).catch(() => {});
    }
    console.log('[seed] target notification', target.serverKey, 'delivered', delivered, 'of', recipients.size);
  } catch (error) {
    console.error('[seed] target sync failed:', error.message);
  } finally { busy = false; }
}

function startSeedingMonitor(guild) {
  if (timer) return;
  void seedingServers(guild);
  timer = setInterval(() => void seedingServers(guild), 30000);
  timer.unref?.();
}
// Legacy scheduler must not change the site's target or bonus flags.
async function endSeeding() { notifiedTarget = null; }
export { seedingServers, endSeeding, startSeedingMonitor };
