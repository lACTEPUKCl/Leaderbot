import { paymentTime } from './donationCandidates.js';

export const windowMs = 10 * 60 * 1000;
const validSteam = value => /^7656119\d{10}$/.test(value || '');
const validActor = value => /^\d{17,20}$/.test(value || '');

export function mismatchCandidates(clicks, recipient, at, { repeated = false } = {}) {
  const people = new Map();
  let matched = false;
  for (const click of clicks) {
    const age = +at - +click.selectedAt;
    if (!(age >= 0 && age <= windowMs) || !validSteam(click.steamId) || !validActor(click.actorId)) continue;
    if (click.steamId === recipient) { matched = true; continue; }
    const key = click.actorId + ':' + click.steamId;
    if (!people.has(key) || people.get(key).selectedAt < click.selectedAt) {
      people.set(key, { discordId: click.actorId, steamId: click.steamId, selectedAt: click.selectedAt });
    }
  }
  return matched && !repeated ? [] : [...people.values()].sort((a,b) => b.selectedAt - a.selectedAt);
}

export function paymentMoment(receipt) {
  return paymentTime(receipt.paymentAt) || receipt.grantedAt;
}

export async function classifyReceipts(db) {
  const stats = db.collection('mainstats'), reviews = db.collection('donationRecipientReviews');
  const batch = await stats.find({'vipReviewPending.id':{$exists:true}}, {projection:{vipReviewPending:1}}).limit(50).toArray();
  const payments = batch.flatMap(user => user.vipReviewPending.map(grant => ({...grant, source:user._id})))
    .sort((a,b) => paymentMoment(a) - paymentMoment(b) || Number(a.id) - Number(b.id));
  for (const grant of payments) {
    const at = paymentMoment(grant), from = new Date(+at - windowMs);
    const clicks = await db.collection('donationLinkAudit').find({platform:'discord',status:'delivered',selectedAt:{$gte:from,$lte:at}},
      {projection:{actorId:1,selectedAt:1,steamId:1}}).toArray();
    const repeated = Boolean(await reviews.findOne({_id:{$ne:grant.id},source:grant.source,at:{$gte:from,$lte:at}}, {projection:{_id:1}}));
    const candidates = mismatchCandidates(clicks, grant.source, at, {repeated});
    await reviews.updateOne({_id:grant.id},{$setOnInsert:{...grant,at,candidates,status:candidates.length?'open':'matched',
      evidence:'click',notify:candidates.length>0}}, {upsert:true});
    await stats.updateOne({_id:grant.source},{$pull:{vipReviewPending:{id:grant.id}}});
    // Remove the empty outbox only if no grant was appended concurrently.
    await stats.updateOne({_id:grant.source,vipReviewPending:{$size:0}},{$unset:{vipReviewPending:''}});
  }
}

// Deleting an earlier purchased interval shifts later intervals towards now.
export function remainingSlice(row, source, now) {
  let start = +row.start, end = +row.end;
  for (const debit of source.vipDebits || []) {
    if (debit.seq <= row.revision) continue;
    const shift = t => t - Math.min(debit.ms, Math.max(0,t - debit.cutStart));
    start = shift(start); end = shift(end);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return 0;
  if (+source.vipEndDate < end && +source.vipEndDate > +now) throw Error('Срок исходного VIP менялся вручную. Нужна сверка.');
  const availableEnd = Math.min(end, +source.vipEndDate || 0);
  return Math.max(0, availableEnd - Math.max(start,+now));
}

// Each step is independently idempotent on standalone MongoDB. The durable
// case stays in "moving" across restarts until both players and delivery agree.
export async function moveBalance(db,row) {
  const stats=db.collection('mainstats');
  const source=await stats.findOne({_id:row.source},{projection:{vipEndDate:1,vipDonationIds:1,vipDebits:1,vipDebitCount:1}});
  if (!source?.vipDonationIds?.includes(row._id)) throw Error('Исходное начисление не найдено.');
  let debit=source.vipDebits?.find(d=>d.id===row._id);
  if (!debit) {
    const now=new Date(), ms=remainingSlice(row,source,now);
    if (!ms) return {ms:0};
    // Recompute the interval end after earlier corrections.
    let end=+row.end;
    for(const d of source.vipDebits||[]) if(d.seq>row.revision) end-=Math.min(d.ms,Math.max(0,end-d.cutStart));
    debit={id:row._id,seq:(source.vipDebitCount||0)+1,ms,cutStart:end-ms,target:row.target};
    const changed=await stats.updateOne({_id:row.source,vipEndDate:source.vipEndDate,
      vipDebitCount:source.vipDebitCount??null,'vipDebits.id':{$ne:row._id}},
      {$set:{vipEndDate:new Date(+source.vipEndDate-ms)},$push:{vipDebits:debit},$inc:{vipDebitCount:1}});
    if(!changed.modifiedCount) throw Error('Баланс изменился. Перенос будет повторён.');
  }
  if(debit.target!==row.target) throw Error('Получатель переноса уже зафиксирован.');
  const credited={$in:[row._id,{$ifNull:['$vipCorrectionCredits',[]]}]};
  const now=new Date();
  await stats.updateOne({_id:row.target},[{$set:{
    vipEndDate:{$cond:[credited,'$vipEndDate',{$add:[{$max:[{$ifNull:['$vipEndDate',now]},now]},debit.ms]}]},
    vipCorrectionCredits:{$setUnion:[{$ifNull:['$vipCorrectionCredits',[]]},[row._id]]},
    vipDeliveryPending:{$cond:[credited,'$vipDeliveryPending','review-'+row._id]},
  }}],{upsert:true});
  return {ms:debit.ms};
}

export async function creditVipPeriod(collection, {steamID,summ,paymentAt,donationId,now,daysToAdd,revision}) {
  const alreadyApplied = donationId ? { $in: [donationId, { $ifNull: ['$vipDonationIds', []] }] } : false;
  const grantStart = { $max: [{ $ifNull: ['$vipEndDate', now] }, now] };
  const grantEnd = { $add: [grantStart, Math.round(daysToAdd * 86400000)] };
  const receipt = { id: donationId, amount: Number(summ), grantedAt: now,
    paymentAt: { $literal: paymentAt || null }, start: grantStart, end: grantEnd,
    revision: { $ifNull: ['$vipDebitCount', 0] } };
  return collection.findOneAndUpdate({ _id: steamID }, [{
    $set: {
      vipDeliveryPending: { $cond: [alreadyApplied, '$vipDeliveryPending', { $literal: revision }] },
      vipEndDate: { $cond: [alreadyApplied, '$vipEndDate', grantEnd] },
      ...(donationId ? { vipReviewPending: { $cond: [alreadyApplied, '$vipReviewPending',
        { $concatArrays: [{ $ifNull: ['$vipReviewPending', []] }, [receipt]] }] },
        vipDonationIds: { $setUnion: [{ $ifNull: ['$vipDonationIds', []] }, [donationId]] } } : {})
    }
  }], { upsert: true, returnDocument: 'before', includeResultMetadata: false });
}
