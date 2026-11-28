import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveDonationRecipient } from '../utility/donationRecipient.js';

const payer = '76561198000000001';
const other = '76561198000000002';
const clans = ['udt', 'rns', 'альфа', 'two words'];
const recipient = (what, comment, options) => resolveDonationRecipient({ what, comment }, clans, null, options);

test('personal SteamID in either input, including nickname equal to a known clan tag', async () => {
  assert.equal((await recipient('UDT', payer)).steamId, payer);
  assert.equal((await recipient(payer, 'Спасибо!')).steamId, payer);
  assert.equal((await recipient(payer, payer)).steamId, payer);
  assert.equal((await recipient('Name', 'SteamID ' + payer)).steamId, payer);
});

test('only a clan tag in the message is enough for a clan donation', async () => {
  for (const name of ['', 'Донатер', 'UDT']) {
    assert.deepEqual(await recipient(name,'  UDT  '), {clanTag:'udt'});
  }
  assert.deepEqual(await recipient('Донатер', 'продление АЛЬФА'), {clanTag:'альфа'});
  assert.deepEqual(await recipient('Донатер', 'Two Words'), {clanTag:'two words'});
  assert.equal((await recipient('UDT','')).clanTag, undefined);
  assert.equal((await recipient('Донатер', 'UD')).clanTag, undefined);
});

test('disagreement within or across fields always leaves VIP unassigned', async () => {
  for (const [name, message] of [[payer, other], [other, 'UDT ' + payer], [payer + ' ' + other, ''],
    ['UDT ' + payer, ''], ['', 'UDT ' + payer], ['RNS','UDT'], ['UDT ' + payer, 'RNS'], ['RNS', 'UDT ' + payer], ['UDT ' + payer, 'RNS ' + payer],
    [payer, 'UDT'], ['', 'UDT RNS'], ['DELETEDTAG ' + payer, ''], ['UDT 00000000000000000', ''], ['Former Clan ' + payer, '']]) {
    const result = await recipient(name, message);
    assert.ok(result.error);
    assert.equal(result.steamId, null);
    assert.equal(result.clanTag, undefined);
  }
});

test('cross-field profile URL conflicts and lookup failures require review', async () => {
  const profile = 'https://steamcommunity.com/id/test';
  assert.equal((await recipient(profile, payer, {resolve: async () => other})).error, 'AMBIGUOUS_STEAM_INFO');
  assert.equal((await recipient(profile, payer, {resolve: async () => {throw Error('offline');}})).error, 'STEAM_LOOKUP_FAILED');
});

test('unregistered lookalikes are never applied to a different clan', async () => {
  const result = await resolveDonationRecipient({comment:'САТ'}, ['cat']);
  assert.equal(result.clanTag, undefined);
  assert.ok(result.error);
});
