import { MongoClient } from 'mongodb';
import { syncVipConfig } from './vip-creater.js';

export function startVipDeliveryRecovery(logger = console) {
  let running = false;
  const sweep = async () => {
    if (running || !process.env.DATABASE_URL) return;
    running = true;
    const mongo = new MongoClient(process.env.DATABASE_URL, { serverSelectionTimeoutMS: 5000 });
    try {
      const collection = mongo.db('SquadJS').collection('mainstats');
      const pending = await collection.find({ vipDeliveryPending: { $type: 'string' }, vipEndDate: { $gt: new Date() } }).limit(20).toArray();
      for (const user of pending) {
        try {
          await syncVipConfig(user._id);
          await collection.updateOne({ _id: user._id, vipDeliveryPending: user.vipDeliveryPending }, { $unset: { vipDeliveryPending: '' } });
          logger.info('[vipDelivery] recovered ' + user._id);
        } catch (error) { logger.warn('[vipDelivery] retry pending: ' + (error.code || error.name)); }
      }
    } catch (error) { logger.warn('[vipDelivery] scan failed: ' + (error.code || error.name)); }
    finally { await mongo.close().catch(() => {}); running = false; }
  };
  const timer = setInterval(sweep, 60000);
  timer.unref();
  void sweep();
  return () => clearInterval(timer);
}
