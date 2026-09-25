import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { runConfigSync } from '../utility/runConfigSync.js';

for (const directory of ['./', '.', path.resolve('folder with spaces')]) {
  test(`sync script uses an absolute executable path: ${directory}`, async () => {
    let calls = 0;
    await runConfigSync(directory, async (file, args, options) => {
      calls++;
      assert.ok(path.isAbsolute(file));
      assert.equal(file, path.resolve(directory, 'syncconfig.sh'));
      assert.deepEqual(args, []);
      assert.equal(options.timeout, 30000);
    });
    assert.equal(calls, 1);
  });
}
test('sync failure propagates so delivery stays pending', async () => {
  await assert.rejects(runConfigSync('./', async () => { throw new Error('failed'); }), /failed/);
});
