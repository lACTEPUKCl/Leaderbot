import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createTelegramSupportLink } from '../utility/telegramSupportLink.js';

test('Telegram support links carry random opaque tokens and persist the exact Discord recipient', async () => {
  const rows = [];
  const db = { collection: name => {
    assert.equal(name, 'telegramSupportLinks');
    return { createIndex: async () => {}, insertOne: async row => rows.push(row) };
  } };
  const url = new URL(await createTelegramSupportLink(db, '123456789012345678', '76561198000000001'));
  const start = url.searchParams.get('start');
  assert.match(start, /^support_[A-Za-z0-9_-]{43}$/);
  assert.ok(start.length <= 64);
  assert.equal(url.pathname, '/RNSVIPBot');
  assert.equal(rows[0]._id, createHash('sha256').update(start.slice(8)).digest('hex'));
  assert.equal(rows[0].steamId, '76561198000000001');
  assert.equal(rows[0].discordId, '123456789012345678');
  assert.ok(rows[0].expiresAt > new Date());
  assert.equal(JSON.stringify(rows).includes(start.slice(8)), false);
  await assert.rejects(createTelegramSupportLink(db, '123456789012345678', 76561198000000001));
  const another = await createTelegramSupportLink(db, '123456789012345679', '76561198000000002');
  assert.notEqual(another, url.href);
});
