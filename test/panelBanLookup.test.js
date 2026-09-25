import test from 'node:test';
import assert from 'node:assert/strict';
import lookup, { banReply } from '../utility/getBansFromPanel.js';

test('empty result is distinct from failure', () => {
  assert.match(banReply({ bans: [], truncated: false }).content, /не найдено/);
  assert.throws(() => banReply({}));
});
test('shows every returned ban with expiry and identity', () => {
  const reply = banReply({ bans: [{ name: 'One', nameBan: true }, { steamId: '76561198714243964', expiresAt: '2030-01-01' }], truncated: true });
  assert.equal(reply.embeds.length, 2);
  assert.equal(reply.embeds[0].toJSON().fields[0].value, 'Бессрочно');
  assert.deepEqual(reply.allowedMentions, { parse: [] });
  assert.match(reply.content, /Уточните/);
});
test('uses panel URL, bounded timeout and no BM fallback', async () => {
  let result;
  await lookup({ content: '76561198714243964', reply: async r => { result = r; } }, {
    env: { SITE_API_URL: 'http://backend:5000/api/', LEADERBOT_BAN_LOOKUP_KEY: 'test' },
    http: { get: async (url, options) => {
      assert.equal(url, 'http://backend:5000/api/integrations/leaderbot/bans');
      assert.equal(options.timeout, 10000);
      assert.equal(options.params.q, '76561198714243964');
      return { data: { bans: [], truncated: false } };
    } },
  });
  assert.match(result.content, /не найдено/);
});
test('outage is not reported as absence of bans', async () => {
  let result;
  await lookup({ content: 'Player', reply: async r => { result = r; } }, { env: {} });
  assert.match(result.content, /не означает, что бана нет/);
});
