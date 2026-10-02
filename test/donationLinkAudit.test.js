import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDonationLink } from '../utility/donationLinkAudit.js';
test('concurrent links preserve recipients, strip provider prefill, and persist delivery state', async()=>{
 const rows=[];const db={collection:name=>{assert.equal(name,'donationLinkAudit');return {insertOne:async row=>rows.push(row),updateOne:async(q,u)=>Object.assign(rows.find(x=>x._id===q._id),u.$set)};}};
 const ids=['76561199038292321','76561199244823805'];
 const links=await Promise.all(ids.map((steamId,i)=>prepareDonationLink(db,{platform:'test',actorId:String(i),steamId,configuredUrl:'https://new.donatepay.ru/@RNSquad?message=76561198000000000#old'})));
 assert.deepEqual(rows.map(r=>r.steamId),ids);assert.equal(new Set(rows.map(r=>r._id)).size,2);
 for(const link of links)assert.equal(link.url,'https://new.donatepay.ru/@RNSquad');
 await links[1].delivered();assert.equal(rows[0].status,'prepared');assert.equal(rows[1].status,'delivered');
});
test('audit write failure never issues an untracked link',async()=>{
 await assert.rejects(prepareDonationLink({collection:()=>({insertOne:async()=>{throw Error('db unavailable')}})},{platform:'test',actorId:'1',steamId:'76561199244823805',configuredUrl:'https://new.donatepay.ru/@RNSquad'}),/db unavailable/);
});
