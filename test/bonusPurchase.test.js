import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseBonusVip, BONUS_VIP_PRICE, BONUS_VIP_DURATION_MS } from '../utility/bonusPurchase.js';
test('bonus purchase is one conditional debit+grant+delivery update, never upsert', async () => {
  const now = new Date('2026-09-19T12:00:00Z');
  let calls = 0;
  const collection = { findOneAndUpdate: async (filter, update, options) => {
    calls++;
    assert.equal(filter._id, '76561190000000000');
    assert.deepEqual(filter.bonuses, { $gte: 15000 });
    assert.deepEqual(filter.vipDeliveryPending, { $exists: false });
    assert.equal(filter.$or[1].lastBonusPurchaseAt.$lt.getTime(), now.getTime() - 30000);
    assert.equal(update[0].$set.vipDeliveryPending.$literal, 'operation');
    assert.deepEqual(update[0].$set.bonuses, { $subtract: ['$bonuses', BONUS_VIP_PRICE] });
    assert.equal(update[0].$set.vipEndDate.$add[1], BONUS_VIP_DURATION_MS);
    assert.equal(options.upsert, undefined);
    return null;
  } };
  assert.equal(await purchaseBonusVip(collection, '76561190000000000', 'operation', now), null);
  assert.equal(calls, 1);
});
