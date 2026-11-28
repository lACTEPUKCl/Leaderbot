import { resolveDonationSteamId } from './donationSteamId.js';

const normalize = value => typeof value === 'string' ? value.normalize('NFC').trim().toLowerCase() : '';

// The clan tag goes in the message. The name may be an ordinary Discord nick
// (even if that nick equals a clan tag) or a SteamID for personal donations.
export async function resolveDonationRecipient(payment, clanTags, steamApi, options) {
  const tags = new Map(clanTags.map(tag => [normalize(tag), tag]));
  const comment = normalize(payment.comment);
  const nickname = normalize(payment.what);
  const legacyRenewal = /^продление\s+(.+)$/u.exec(comment);
  const clan = tags.get(comment) || (legacyRenewal && tags.get(legacyRenewal[1]));
  const resolution = await resolveDonationSteamId(payment, steamApi, options);
  if (resolution.error && resolution.error !== 'NO_STEAM_INFO') return resolution;

  if (clan) {
    const otherTag = tags.get(nickname);
    if (otherTag && otherTag !== clan) return { steamId: null, error: 'AMBIGUOUS_CLAN_TAG' };
    if (resolution.steamId) return { steamId: null, error: 'AMBIGUOUS_DONATION_RECIPIENT' };
    return { clanTag: clan };
  }

  // Mixed references from stale forms must never become a personal VIP.
  const tagWithId = field => {
    const pair = /^(.+)\s+\d{17}$/u.exec(field);
    return pair && !/^steam(?:\s?id(?:64)?)?:?$/u.test(pair[1]);
  };
  if (tagWithId(comment) || tagWithId(nickname)) {
    return { steamId: null, error: 'AMBIGUOUS_DONATION_RECIPIENT' };
  }
  if (comment.split(/\s+/u).some(word => tags.has(word))) {
    return { steamId: null, error: 'AMBIGUOUS_CLAN_TAG' };
  }
  return resolution;
}
