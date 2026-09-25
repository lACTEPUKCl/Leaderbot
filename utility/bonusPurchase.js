export const BONUS_VIP_PRICE = 15000;
export const BONUS_VIP_DURATION_MS = 300 / 9.863 * 86400000;

// Debit, grant and durable delivery marker are one atomic document update.
export async function purchaseBonusVip(collection, steamID, operationId, now = new Date()) {
  return collection.findOneAndUpdate({
    _id: steamID, bonuses: { $gte: BONUS_VIP_PRICE },
    vipDeliveryPending: { $exists: false },
    $or: [{ lastBonusPurchaseAt: { $exists: false } }, { lastBonusPurchaseAt: { $lt: new Date(now.getTime() - 30000) } }]
  }, [{ $set: {
    bonuses: { $subtract: ['$bonuses', BONUS_VIP_PRICE] },
    vipEndDate: { $add: [{ $max: [{ $ifNull: ['$vipEndDate', now] }, now] }, BONUS_VIP_DURATION_MS] },
    lastBonusPurchaseAt: now,
    vipDeliveryPending: { $literal: operationId }
  } }], { returnDocument: 'after', includeResultMetadata: false });
}
