import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalCandidates, paymentTime, donationCandidates, claimManualGrant, isSuccessfulDonation } from '../utility/donationCandidates.js';
test('only successful donations qualify',()=>{for(const status of ['wait','cancel','user'])assert.equal(isSuccessfulDonation({status,type:'donation'}),false);assert.equal(isSuccessfulDonation({status:'success',type:'cashout'}),false);assert.equal(isSuccessfulDonation({status:'success',type:'donation'}),true);});
test('name history is ambiguous and deduplicated',()=>{const rows=[{username:' Alice ',steamID:'76561199000000001',id:1},{username:'alice',steamID:'76561199000000002',id:2},{username:'alice',steamID:'76561199000000001',id:3}];assert.equal(historicalCandidates(rows,'ALICE').length,2);assert.equal(historicalCandidates(rows,'')[0],undefined);assert.equal(historicalCandidates(rows,'ALICE')[0].previousTransactionId,'3');});
test('timestamp needs timezone',()=>{assert.equal(paymentTime('2026-10-05 16:00:00'),null);assert.ok(paymentTime('2026-10-05T16:00:00.000000Z'));});
test('candidates precede payment by at most thirty minutes',async()=>{let filter;const db={collection:name=>name==='donationLinkAudit'?{find:q=>{filter=q;return{sort:()=>({limit:()=>({toArray:async()=>[{steamId:'76561199000000001',actorId:'123456789012345678',deliveredAt:new Date('2026-10-05T15:55:00Z')}]})})}}}:{findOne:async()=>null}};const rows=await donationCandidates(db,{created_at:'2026-10-05T16:00:00Z'},[]);assert.equal(filter.deliveredAt.$gte.toISOString(),'2026-10-05T15:30:00.000Z');assert.equal(filter.deliveredAt.$lte.toISOString(),'2026-10-05T16:00:00.000Z');assert.equal(rows.length,1);});
test('concurrent manual claim cannot grant twice',async()=>{let pending=true;const col={findOneAndUpdate:async(q,u)=>{assert.equal(q.status,'pending');assert.equal(u.$set.status,'issuing');if(!pending)return null;pending=false;return{_id:q._id};}};const result=await Promise.all([claimManualGrant(col,'a','admin','steam'),claimManualGrant(col,'a','admin','steam')]);assert.equal(result.filter(Boolean).length,1);});

const candidateDb=issued=>({collection:name=>name==='donationLinkAudit'?{find:()=>({sort:()=>({limit:()=>({toArray:async()=>issued})})})}:{findOne:async()=>null}});
test('link recipient gets corroboration only from the same Steam ID',async()=>{
  const id='76561199000000001';
  const history=[{id:10,username:' Александр ',steamID:id},{id:11,username:'Александр',steamID:'76561199000000002'}];
  const rows=await donationCandidates(candidateDb([{steamId:id,actorId:'123456789012345678',deliveredAt:new Date('2026-10-05T15:55:00Z')}]),{id:12,what:'АЛЕКСАНДР',created_at:'2026-10-05T16:00:00Z'},history);
  assert.equal(rows.length,2);
  assert.equal(rows[0].previousTransactionId,'10');
  assert.equal(rows[0].historyNameMatch,true);
  assert.match(rows[0].reason,/Получил ссылку/);
  assert.match(rows[0].reason,/совпадает с прошлым донатом №10/);
});
test('different names, errors and newer transactions cannot corroborate',async()=>{
  const id='76561199000000001';
  const rows=await donationCandidates(candidateDb([{steamId:id,actorId:'123456789012345678',deliveredAt:new Date('2026-10-05T15:55:00Z')}]),{id:12,what:'Александр',created_at:'2026-10-05T16:00:00Z'},[{id:10,username:'Борис',steamID:id},{id:11,username:'Александр',steamID:id,error:'FAILED'},{id:13,username:'Александр',steamID:id}]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].historyNameMatch,undefined);
});
