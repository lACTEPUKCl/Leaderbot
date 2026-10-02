import { randomUUID } from 'node:crypto';

export async function prepareDonationLink(db, { platform, actorId, steamId, configuredUrl }) {
  if (!/^7656119\d{10}$/.test(String(steamId))) throw new Error('Invalid donation Steam ID');
  const url = new URL(configuredUrl);
  if (url.protocol !== 'https:' || !['new.donatepay.ru', 'donatepay.ru'].includes(url.hostname)) throw new Error('Unexpected donation provider');
  // Provider prefill was observed substituting unrelated IDs in clean sessions.
  url.search = '';
  url.hash = '';
  const record = { _id: randomUUID(), createdAt: new Date(), platform, actorId: String(actorId), steamId: String(steamId), url: url.href, autofill: false, status: 'prepared' };
  await db.collection('donationLinkAudit').insertOne(record);
  return { url: record.url, delivered: () => db.collection('donationLinkAudit').updateOne({ _id: record._id }, { $set: { status: 'delivered', deliveredAt: new Date() } }) };
}
