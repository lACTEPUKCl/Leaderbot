import { randomUUID } from 'node:crypto';
import { isSteamId64 } from './donationSteamId.js';

export const DONATEPAY_URL = 'https://new.donatepay.ru/donate/RNSquad';

export async function prepareDonationLink(db, { platform, actorId, steamId, selectedAt }) {
  if (!isSteamId64(steamId)) throw new Error('Invalid donation Steam ID');
  const record = { _id: randomUUID(), createdAt: new Date(), platform, actorId: String(actorId), steamId, url: DONATEPAY_URL, autofill: false, ...(selectedAt ? {selectedAt} : {}), status: 'prepared' };
  await db.collection('donationLinkAudit').insertOne(record);
  return { url: record.url, delivered: () => db.collection('donationLinkAudit').updateOne({ _id: record._id }, { $set: { status: 'delivered', deliveredAt: new Date() } }) };
}
