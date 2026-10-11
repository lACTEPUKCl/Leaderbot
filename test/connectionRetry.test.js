import test from 'node:test';
import assert from 'node:assert/strict';
import { retryConnection } from '../utility/connectionRetry.js';
const options = { delay: async () => {}, logger: { warn() {} } };
test('recovers from failed connection establishment', async () => {
  let calls = 0;
  const result = await retryConnection(async () => {
    if (++calls < 3) throw Object.assign(new Error(), { code: 'UND_ERR_CONNECT_TIMEOUT' });
    return 'sent';
  }, options);
  assert.equal(result, 'sent'); assert.equal(calls, 3);
});
test('does not retry ambiguous response timeout or API error', async () => {
  for (const code of ['UND_ERR_HEADERS_TIMEOUT', 429, 401]) {
    let calls = 0;
    await assert.rejects(retryConnection(async () => { calls++; throw Object.assign(new Error(), { code }); }, options));
    assert.equal(calls, 1);
  }
});
test('stops after configured number of failed connections', async () => {
  let calls = 0;
  await assert.rejects(retryConnection(async () => { calls++; throw Object.assign(new Error(), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }); }, options));
  assert.equal(calls, 3);
});
