import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {classifyReceipts, creditVipPeriod, mismatchCandidates, moveBalance, remainingSlice} from '../utility/donationRecipientReview.js';

const payer='76561198147361797', recipient='76561198872173397', actor='264092594454265856';
const receiptTime=new Date('2026-11-22T06:16:34Z');
const click={selectedAt:new Date('2026-11-22T06:13:44Z'),actorId:actor,steamId:payer};

test('today’s mismatch is detected regardless of both form fields being replaced',()=>{
  assert.deepEqual(mismatchCandidates([click,click],recipient,receiptTime).map(c=>c.steamId),[payer]);
  assert.deepEqual(mismatchCandidates([{...click,selectedAt:new Date(+receiptTime-600001)}],recipient,receiptTime),[]);
  assert.deepEqual(mismatchCandidates([{...click,selectedAt:new Date(+receiptTime+1)}],recipient,receiptTime),[]);
  const matching={...click,actorId:'199999999999999991',steamId:recipient};
  assert.deepEqual(mismatchCandidates([click,matching],recipient,receiptTime),[]);
  assert.equal(mismatchCandidates([matching,click],recipient,receiptTime,{repeated:true})[0].steamId,payer);
});
test('only the unconsumed interval moves, including previous extensions and earlier corrections',()=>{
  const grant={start:new Date(2000),end:new Date(4000),revision:0};
  const state={vipEndDate:new Date(9000)};
  assert.equal(remainingSlice(grant,state,new Date(1000)),2000);
  assert.equal(remainingSlice(grant,state,new Date(3000)),1000);
  assert.equal(remainingSlice(grant,state,new Date(4100)),0);
  assert.equal(remainingSlice(grant,{...state,vipDebits:[{seq:1,cutStart:800,ms:600}]},new Date(2500)),900);
  assert.throws(()=>remainingSlice(grant,{vipEndDate:new Date(3900)},new Date(2100)));
});
test('standalone MongoDB classifies explicit clicks, moves once and preserves unrelated periods', {skip:!process.env.DONATION_TEST_MONGO},async()=>{
  const client=new MongoClient(process.env.DONATION_TEST_MONGO);
  const db=client.db('qa_review_'+randomUUID().replaceAll('-',''));
  try {
    const stats=db.collection('mainstats'), reviews=db.collection('donationRecipientReviews'), audit=db.collection('donationLinkAudit');
    const now=new Date(),day=86400000, base=new Date(+now+2*day);
    await stats.insertOne({_id:recipient,vipEndDate:base});
    await stats.insertOne({_id:payer,discordid:actor,vipEndDate:base});
    const args={steamID:recipient,summ:300,paymentAt:receiptTime.toISOString(),donationId:'100',now,daysToAdd:30,revision:'test-first'};
    await creditVipPeriod(stats,args);await creditVipPeriod(stats,args);
    await audit.insertOne({...click,platform:'discord',status:'delivered'});
    await audit.insertOne({platform:'discord',status:'delivered',deliveredAt:click.selectedAt,actorId:'199999999999999990',steamId:recipient});
    await classifyReceipts(db);
    const row=await reviews.findOne({_id:'100'});assert.equal(row.status,'open');assert.equal(row.candidates.length,1);
    assert.equal(+row.start,+base);assert.equal(+row.end,+base+30*day);
    assert.equal(+(await stats.findOne({_id:payer})).vipEndDate,+base);
    await creditVipPeriod(stats,{...args,donationId:'101',daysToAdd:5,revision:'test-next'});
    row.target=payer;
    await moveBalance(db,row);await moveBalance(db,row);
    assert.equal(+(await stats.findOne({_id:payer})).vipEndDate,+base+30*day);
    const original=await stats.findOne({_id:recipient});assert.equal(+original.vipEndDate,+base+5*day);
    assert.equal(original.vipDebits.length,1);
    assert.equal(original.vipReviewPending.length,1);
    await classifyReceipts(db);
    const later=await reviews.findOne({_id:'101'});
    assert.equal(remainingSlice(later,original,now),5*day);
  }finally{await db.dropDatabase();await client.close();}
});
