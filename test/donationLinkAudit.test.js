import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDonationLink } from '../utility/donationLinkAudit.js';

test('concurrent donors receive the same clean link and keep separate delivery records', async()=>{
 const rows=[];const db={collection:name=>{assert.equal(name,'donationLinkAudit');return {insertOne:async row=>rows.push(row),updateOne:async(q,u)=>Object.assign(rows.find(x=>x._id===q._id),u.$set)};}};
 const ids=['76561199038292321','76561199244823805'];
 const names=['Первый & #игрок','Второй'];
 const links=await Promise.all(ids.map((steamId,i)=>prepareDonationLink(db,{platform:'test',actorId:String(i),steamId,discordName:names[i],configuredUrl:'https://new.donatepay.ru/@RNSquad?name=Other&amount=999&message=76561198000000000#old'})));
 assert.deepEqual(rows.map(r=>r.steamId),ids);assert.equal(new Set(rows.map(r=>r._id)).size,2);
 for(const [index,link] of links.entries()) {
  const url=new URL(link.url);
  assert.equal(url.origin,'https://new.donatepay.ru');assert.equal(url.pathname,'/donate/RNSquad');
  assert.equal(url.search,'');assert.equal(url.hash,'');assert.equal(rows[index].autofill,false);
 }
 await links[1].delivered();assert.equal(rows[0].status,'prepared');assert.equal(rows[1].status,'delivered');
});

test('stale parameters are never forwarded and numeric SteamIDs are refused',async()=>{
 const db={collection:()=>({insertOne:async()=>{}})};
 const input={platform:'discord',actorId:'123',steamId:'76561199244823805',configuredUrl:'https://new.donatepay.ru/donate/RNSquad?name=Previous'};
 const result=await prepareDonationLink(db,input);
 assert.equal(result.url,'https://new.donatepay.ru/donate/RNSquad');
 await assert.rejects(prepareDonationLink(db,{...input,steamId:Number(input.steamId)}),/Invalid donation Steam ID/);
});
test('audit write failure never issues an untracked link',async()=>{
 await assert.rejects(prepareDonationLink({collection:()=>({insertOne:async()=>{throw Error('db unavailable')}})},{platform:'test',actorId:'1',steamId:'76561199244823805',configuredUrl:'https://new.donatepay.ru/@RNSquad'}),/db unavailable/);
});
