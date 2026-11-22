import { creditVipPeriod } from './donationRecipientReview.js';
import { donationMongoOptions } from './fetchJson.js';
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
export function syncVipConfig(steamID, readActive) {
  if (!/^\d{17}$/.test(String(steamID))) throw new Error('Invalid SteamID');
  const work = configQueue.catch(() => {}).then(async () => {
    const target = path.join(options.adminsCfgPath, 'Admins.cfg');
    const data = await fs.readFile(target, 'utf8');
    const lines = data.split(/\r?\n/);
    const active = readActive ? await readActive() : true;
    const row = 'Admin=' + steamID + ':Reserved';
    const lastEnd = lines.reduce((last,line,i) => line.startsWith('//END') ? i : last, -1);
    // Only personal VIP lines, never clan entries or protected admin assignments.
    const removable = (line,i) => i > lastEnd && line.trim() === row;
    const next = active
      ? (lines.some(line => line.startsWith(row)) ? data : data.replace(/\s*$/, '') + '\r\n' + row + '\r\n')
      : lines.some(removable) ? lines.filter((line,i) => !removable(line,i)).join('\r\n') : data;
    if (next !== data) {
      await fs.mkdir(options.adminsCfgBackups, { recursive: true });
      await fs.copyFile(target, path.join(options.adminsCfgBackups, 'Admins-' + Date.now() + '-' + steamID + '.cfg'));
      await fs.writeFile(target, next);
    }
    await runConfigSync(options.syncconfigPath);
    return next;
  });
  configQueue = work;
  return work;
}

const vipCreater = async (steamID, nickname, summ, discordID, transactionId, paymentAt) => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!/^\d{17}$/.test(String(steamID)) || !(Number(summ) > 0)) throw new Error('Invalid VIP grant');
  const daysToAdd = Number(summ) / 9.863;
  const client = new MongoClient(process.env.DATABASE_URL, donationMongoOptions);
  try {
    const collection = client.db('SquadJS').collection('mainstats');
    const now = new Date();
    const revision = randomUUID();
    if (transactionId !== undefined && !/^\d+$/.test(String(transactionId))) throw new Error('Invalid donation transaction');
    const donationId = transactionId === undefined ? null : String(transactionId);
    const before = await creditVipPeriod(collection, {steamID, summ, paymentAt, donationId, now, daysToAdd, revision});
    const oldVipEndDate = before?.vipEndDate instanceof Date ? before.vipEndDate : null;
    const duplicate = donationId !== null && before?.vipDonationIds?.includes(donationId);
    const isExtension = oldVipEndDate > now;
    const newVipEndDate = duplicate ? oldVipEndDate : new Date(Math.max(now.getTime(), oldVipEndDate?.getTime() || 0) + daysToAdd * 86400000);
    await syncVipConfig(steamID);
    await collection.updateOne({ _id: steamID, vipDeliveryPending: revision }, { $unset: { vipDeliveryPending: '' } });
    return { steamID, nickname, summ, duplicate, daysToAdd: duplicate ? 0 : daysToAdd, isExtension, oldVipEndDate, newVipEndDate };
  } finally { await client.close(); }
};
export default { vipCreater };
