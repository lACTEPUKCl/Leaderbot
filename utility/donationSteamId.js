import fetch from 'node-fetch';
const BASE = 76561197960265728n;
export function isSteamId64(value) {
  return typeof value === 'string' && /^\d{17}$/.test(value)
    && BigInt(value) > BASE && BigInt(value) <= BASE + 4294967295n;
}
async function resolveVanity(name, key) {
  const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/');
  url.searchParams.set('key', key || '');
  url.searchParams.set('vanityurl', name);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Steam lookup failed');
  const data = await response.json();
  if (data?.response?.success === 42) return null;
  if (data?.response?.success !== 1 || !isSteamId64(data.response.steamid)) throw new Error('Invalid Steam lookup response');
  return data.response.steamid;
}
async function parseField(value, resolve) {
  if (typeof value !== 'string') return { steamId: null };
  const ids = new Set();
  const vanity = new Set();
  // Ignore numbers inside unrelated URLs rather than treating them as Steam profiles.
  const rest = value.replace(/(?:https?:\/\/|www\.)[^\s<>"']+/gi, raw => {
    try {
      const url = new URL(raw.startsWith('www.') ? `https://${raw}` : raw);
      if (!['steamcommunity.com', 'www.steamcommunity.com'].includes(url.hostname) || url.username || url.password || url.port) return ' ';
      const match = url.pathname.match(/^\/(profiles|id)\/([^/]+)\/?$/);
      if (match?.[1] === 'profiles' && isSteamId64(match[2])) ids.add(match[2]);
      if (match?.[1] === 'id' && /^[a-zA-Z0-9_-]{1,64}$/.test(match[2])) vanity.add(match[2]);
    } catch { /* Not a usable profile URL. */ }
    return ' ';
  });
  for (const match of rest.matchAll(/(?<![\p{L}\p{N}_])\d{17}(?![\p{L}\p{N}_])/gu)) {
    if (isSteamId64(match[0])) ids.add(match[0]);
  }
  if (ids.size > 1 || vanity.size > 4) return { steamId: null, error: 'AMBIGUOUS_STEAM_INFO' };
  try {
    for (const name of vanity) {
      const id = await resolve(name);
      if (isSteamId64(id)) ids.add(id);
      if (ids.size > 1) return { steamId: null, error: 'AMBIGUOUS_STEAM_INFO' };
    }
  } catch {
    // A temporary lookup failure must not redirect a donation to the nickname.
    return { steamId: null, error: 'STEAM_LOOKUP_FAILED' };
  }
  return { steamId: [...ids][0] || null };
}
export async function resolveDonationSteamId({ comment, what } = {}, steamApi, {
  resolve = name => resolveVanity(name, steamApi),
} = {}) {
  let candidate;
  for (const [source, value] of [['comment', comment], ['nickname', what]]) {
    const result = await parseField(value, resolve);
    if (result.error) return { ...result, source };
    if (!result.steamId) continue;
    if (candidate && candidate.steamId !== result.steamId) {
      return { steamId: null, source: 'both', error: 'AMBIGUOUS_STEAM_INFO' };
    }
    candidate ??= { ...result, source };
  }
  return candidate || { steamId: null, source: null, error: 'NO_STEAM_INFO' };
}
