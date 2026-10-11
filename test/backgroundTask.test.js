import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBackgroundTask } from '../utility/backgroundTask.js';
const logger = { info() {}, error() {} };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('failed lobby startup does not stop donation processing and is retried', async () => {
  let donations = 0, attempts = 0;
  const lobby = startBackgroundTask('lobby', async () => { attempts++; throw new Error('timeout'); }, { logger });
  const donate = startBackgroundTask('donations', async () => { donations++; }, { logger });
  await tick();
  assert.equal(donations, 1);
  await lobby.run();
  assert.equal(attempts, 2);
  lobby.stop(); donate.stop();
});

test('pending job does not overlap or block another task', async () => {
  let finish, attempts = 0, other = 0;
  const blocked = startBackgroundTask('slow', () => { attempts++; return new Promise(resolve => { finish = resolve; }); }, { logger });
  const independent = startBackgroundTask('other', async () => { other++; }, { logger });
  await blocked.run();
  await tick();
  assert.equal(attempts, 1);
  assert.equal(other, 1);
  finish(); blocked.stop(); independent.stop();
});

test('successful startup is not initialized twice', async () => {
  let attempts = 0;
  const job = startBackgroundTask('init', async () => { attempts++; }, { logger, stopAfterSuccess: true });
  await tick(); await job.run();
  assert.equal(attempts, 1);
  job.stop();
});
