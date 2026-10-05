export function paymentTime(value) {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function historicalCandidates(transactions, name, beforeId, limit = 5) {
  const normalized = String(name || '').trim().toLocaleLowerCase('ru');
  if (!normalized) return [];
  const found = new Map();
  for (const row of [...transactions].reverse()) {
    if (row.error || (beforeId != null && !(Number(row.id) < Number(beforeId)))) continue;
    if (String(row.username || '').trim().toLocaleLowerCase('ru') !== normalized || !/^7656119\d{10}$/.test(row.steamID || '')) continue;
    if (!found.has(row.steamID)) found.set(row.steamID, { steamId: row.steamID, reason: 'Совпало имя в прежнем донате', previousTransactionId: String(row.id) });
  }
  return [...found.values()].slice(0, limit);
}
export async function donationCandidates(db, payment, history) {
  const at = paymentTime(payment.created_at);
  let issued = [];
  if (at) issued = await db.collection('donationLinkAudit').find({platform:'discord',status:'delivered',deliveredAt:{$gte:new Date(at.getTime()-30*60000),$lte:at}}).sort({deliveredAt:-1}).limit(100).toArray();
  const result = new Map();
  for (const row of issued) {
    if (!/^7656119\d{10}$/.test(row.steamId) || !/^\d{17,20}$/.test(row.actorId) || result.has(row.steamId)) continue;
    result.set(row.steamId,{steamId:row.steamId,discordId:row.actorId,reason:`Получил ссылку за ${Math.max(0,Math.round((at-new Date(row.deliveredAt))/60000))} мин. до платежа`});
    if (result.size>=5) break;
  }
  for (const match of historicalCandidates(history,payment.what,payment.id,Infinity)) {
    const candidate=result.get(match.steamId);
    if (candidate) {
      candidate.reason += `\nИмя «${String(payment.what).trim()}» совпадает с прошлым донатом №${match.previousTransactionId} этого Steam ID`;
      candidate.previousTransactionId=match.previousTransactionId;
      candidate.historyNameMatch=true;
    } else if (result.size<5) result.set(match.steamId,{...match,historyNameMatch:true});
  }
  const candidates=[...result.values()];
  for (const row of candidates) if (!row.discordId) {
    const user=await db.collection('mainstats').findOne({_id:row.steamId},{projection:{discordid:1}});
    if (/^\d{17,20}$/.test(user?.discordid||'')) row.discordId=user.discordid;
  }
  return candidates;
}
export async function claimManualGrant(collection, id, actorId, steamId) {
  return collection.findOneAndUpdate({_id:id,status:'pending'},{$set:{status:'issuing',issuedBy:actorId,selectedSteamId:steamId,startedAt:new Date()}},{returnDocument:'after',includeResultMetadata:false});
}

export function isSuccessfulDonation(payment) { return payment?.status === 'success' && payment?.type === 'donation'; }
