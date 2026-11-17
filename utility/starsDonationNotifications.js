import { MongoClient } from 'mongodb';
import { createHash } from 'node:crypto';
import { Routes } from 'discord.js';
import { donationMongoOptions } from './fetchJson.js';

export async function deliverStarsDonations(db, rest, channelId) {
  const orders = db.collection('telegramStarsOrders');
  const pending = await orders.find({ status: 'fulfilled', discordNotifiedAt: { $exists: false } })
    .sort({ createdAt: 1 }).limit(20).toArray();
  for (const row of pending) {
    const order = await orders.findOneAndUpdate({ _id: row._id, status: 'fulfilled', discordNotifiedAt: { $exists: false },
      $or: [{ discordLease: { $exists: false } }, { discordLease: { $lt: new Date() } }] },
    { $set: { discordLease: new Date(Date.now() + 120000) } }, { returnDocument: 'after' });
    if (!order) continue;
    try {
      const marker = `Stars · ${order._id}`;
      let message;
      // Reconcile a previous send whose database acknowledgement failed. Walk
      // back to the attempt time, so a busy log channel cannot hide the receipt.
      if (order.discordAttemptAt) {
        let before;
        for (;;) {
          const query = new URLSearchParams({ limit: '100' });
          if (before) query.set('before', before);
          const history = await rest.get(Routes.channelMessages(channelId), { query });
          message = history.find(item => item.embeds?.some(embed => embed.footer?.text === marker));
          if (message || history.length < 100 || Date.parse(history.at(-1).timestamp) < order.discordAttemptAt.getTime() - 5000) break;
          before = history.at(-1).id;
        }
      }
      if (!message) {
        await orders.updateOne({ _id: order._id }, { $set: { discordAttemptAt: new Date() } });
        const player = await db.collection('mainstats').findOne({ _id: order.steamId }, { projection: { name: 1, discordid: 1 } });
        const fields = [
          { name: 'Сумма', value: `${order.amount} ⭐`, inline: true },
          { name: 'SteamID', value: order.steamId, inline: true },
          { name: 'От', value: String(player?.name || order.steamId).slice(0, 1024), inline: true },
          { name: 'Telegram ID', value: order.payerId, inline: true },
        ];
        if (player?.discordid && /^\d{17,20}$/.test(player.discordid)) fields.push({ name: 'Discord', value: `<@${player.discordid}>`, inline: true });
        const days = order.durationMs / 86400000;
        const expiry = new Date(order.vipEndDate).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
        const nonce = BigInt('0x' + createHash('sha256').update(order._id).digest('hex').slice(0, 16)).toString();
        message = await rest.post(Routes.channelMessages(channelId), { body: {
          nonce, enforce_nonce: true, allowed_mentions: { parse: [] },
          embeds: [{ title: 'Поддержка через Telegram Stars', color: 0x00ff00,
            description: `Добавлено **${days.toLocaleString('ru-RU', { maximumFractionDigits: 4 })}** дней VIP.\nДействует до **${expiry} МСК**.`,
            fields, footer: { text: marker }, timestamp: new Date(order.paidAt || order.fulfilledAt).toISOString() }],
        } });
      }
      await orders.updateOne({ _id: order._id }, { $set: { discordNotifiedAt: new Date(), discordMessageId: message.id,
        discordChannelId: channelId }, $unset: { discordLease: '' } });
    } catch (error) {
      console.warn('[Stars Discord] delivery pending', error.code || error.name);
    }
  }
}

export function createStarsDonationNotifier(client, uri, channelId) {
  const mongo = new MongoClient(uri, donationMongoOptions);
  let ready;
  return async () => {
    if (!channelId) throw new Error('Missing donation log channel');
    ready ||= mongo.connect().then(async () => {
      await mongo.db('SquadJS').collection('telegramStarsOrders').createIndex({ status: 1, discordNotifiedAt: 1, createdAt: 1 });
    }).catch(error => { ready = null; throw error; });
    await ready;
    await deliverStarsDonations(mongo.db('SquadJS'), client.rest, channelId);
  };
}
