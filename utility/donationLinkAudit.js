import { randomUUID } from 'node:crypto';

export function donationDiscordName(interaction) {
  const user = interaction.user;
  const member = interaction.member;
  const sameUser = !member?.user?.id || member.user.id === user.id;
  const names = sameUser ? [member?.nickname, member?.nick, member?.displayName] : [];
  return [...names, user.globalName, user.username]
    .find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

export async function prepareDonationLink(db, { platform, actorId, steamId, configuredUrl, discordName = '' }) {
  if (typeof steamId !== 'string' || !/^7656119\d{10}$/.test(steamId)) throw new Error('Invalid donation Steam ID');
  const url = new URL(configuredUrl);
  if (url.protocol !== 'https:' || !['new.donatepay.ru', 'donatepay.ru'].includes(url.hostname)) throw new Error('Unexpected donation provider');
  // Always replace all form fields so provider/browser state cannot retain
  // another donor's name, amount or comment.
  url.search = '';
  url.hash = '';
  if (url.hostname === 'new.donatepay.ru') url.pathname = url.pathname.replace(/^\/@([^/]+)\/?$/, '/donate/$1');
  url.searchParams.set('name', typeof discordName === 'string' ? discordName.trim() : '');
  url.searchParams.set('amount', '300');
  url.searchParams.set('message', steamId);
  const record = { _id: randomUUID(), createdAt: new Date(), platform, actorId: String(actorId), steamId, url: url.href, autofill: true, status: 'prepared' };
  await db.collection('donationLinkAudit').insertOne(record);
  return { url: record.url, delivered: () => db.collection('donationLinkAudit').updateOne({ _id: record._id }, { $set: { status: 'delivered', deliveredAt: new Date() } }) };
}
