import fs from 'node:fs/promises';
import path from 'node:path';
import { runConfigSync } from './runConfigSync.js';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { config as loadEnv } from 'dotenv';
import options from '../config.js';
loadEnv();
let configQueue = Promise.resolve();

// Serialize in-process read/modify/write and await backup, write and propagation.
export function syncVipConfig(steamID) {
  if (!/^\d{17}$/.test(String(steamID))) throw new Error('Invalid SteamID');
  const work = configQueue.catch(() => {}).then(async () => {
    const target = path.join(options.adminsCfgPath, 'Admins.cfg');
    const data = await fs.readFile(target, 'utf8');
    const lines = data.split(/\r?\n/);
    if (!lines.some(line => line.startsWith('Admin=' + steamID + ':Reserved'))) {
      await fs.mkdir(options.adminsCfgBackups, { recursive: true });
      await fs.copyFile(target, path.join(options.adminsCfgBackups, 'Admins-' + Date.now() + '-' + steamID + '.cfg'));
      await fs.writeFile(target, data.replace(/\s*$/, '') + '\r\nAdmin=' + steamID + ':Reserved\r\n');
    }
    await runConfigSync(options.syncconfigPath);
  });
  configQueue = work;
  return work;
}

const vipCreater = async (steamID, nickname, summ) => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!/^\d{17}$/.test(String(steamID)) || !(Number(summ) > 0)) throw new Error('Invalid VIP grant');
  const daysToAdd = Number(summ) / 9.863;
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    const collection = client.db('SquadJS').collection('mainstats');
    const now = new Date();
    const revision = randomUUID();
    const before = await collection.findOneAndUpdate({ _id: steamID }, [{
      $set: { vipDeliveryPending: { $literal: revision }, vipEndDate: { $add: [{ $max: [{ $ifNull: ['$vipEndDate', now] }, now] }, daysToAdd * 86400000] } }
    }], { upsert: true, returnDocument: 'before', includeResultMetadata: false });
    const oldVipEndDate = before?.vipEndDate instanceof Date ? before.vipEndDate : null;
    const isExtension = oldVipEndDate > now;
    const newVipEndDate = new Date(Math.max(now.getTime(), oldVipEndDate?.getTime() || 0) + daysToAdd * 86400000);
    await syncVipConfig(steamID);
    await collection.updateOne({ _id: steamID, vipDeliveryPending: revision }, { $unset: { vipDeliveryPending: '' } });
    return { steamID, nickname, summ, daysToAdd, isExtension, oldVipEndDate, newVipEndDate };
  } finally { await client.close(); }
};
export default { vipCreater };
