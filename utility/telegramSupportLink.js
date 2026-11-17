import { randomBytes, createHash } from 'node:crypto';

let indexReady;

export async function createTelegramSupportLink(db, discordId, steamId) {
  if (typeof discordId !== 'string' || !/^\d{17,20}$/.test(discordId)
    || typeof steamId !== 'string' || !/^7656119\d{10}$/.test(steamId)) throw new Error('Invalid support identity');
  const links = db.collection('telegramSupportLinks');
  indexReady ||= links.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch(error => { indexReady = null; throw error; });
  await indexReady;
  const token = randomBytes(32).toString('base64url');
  await links.insertOne({
    _id: createHash('sha256').update(token).digest('hex'), discordId, steamId,
    createdAt: new Date(), expiresAt: new Date(Date.now() + 86400000),
  }, { writeConcern: { w: 'majority', j: true } });
  return `https://t.me/RNSVIPBot?start=support_${token}`;
}
