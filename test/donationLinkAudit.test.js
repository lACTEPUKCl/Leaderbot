import test from 'node:test';
import assert from 'node:assert/strict';
import { donationDiscordName, prepareDonationLink } from '../utility/donationLinkAudit.js';

test('Discord name belongs to the interaction caller and prefers the server nickname',()=>{
 const user={id:'111',globalName:'Global',username:'Login'};
 assert.equal(donationDiscordName({user,member:{nickname:'Guild nick',displayName:'Display',user}}),'Guild nick');
 assert.equal(donationDiscordName({user,member:{nick:'Raw member nick'}}),'Raw member nick');
 assert.equal(donationDiscordName({user,member:{user:{id:'222'},nickname:'Other person'}}),'Global');
 assert.equal(donationDiscordName({user}),'Global');
 assert.equal(donationDiscordName({user:{id:'111',username:'Login'}}),'Login');
 assert.equal(donationDiscordName({user:{id:'111'}}),'');
});
test('concurrent links replace stale form fields with each caller and persist delivery state', async()=>{
 const rows=[];const db={collection:name=>{assert.equal(name,'donationLinkAudit');return {insertOne:async row=>rows.push(row),updateOne:async(q,u)=>Object.assign(rows.find(x=>x._id===q._id),u.$set)};}};
 const ids=['76561199038292321','76561199244823805'];
 const names=['Первый & #игрок','Второй'];
 const links=await Promise.all(ids.map((steamId,i)=>prepareDonationLink(db,{platform:'test',actorId:String(i),steamId,discordName:names[i],configuredUrl:'https://new.donatepay.ru/@RNSquad?name=Other&amount=999&message=76561198000000000#old'})));
 assert.deepEqual(rows.map(r=>r.steamId),ids);assert.equal(new Set(rows.map(r=>r._id)).size,2);
 for(const [index,link] of links.entries()) {
  const url=new URL(link.url);
  assert.equal(url.origin,'https://new.donatepay.ru');assert.equal(url.pathname,'/donate/RNSquad');
  assert.equal(url.searchParams.get('name'),names[index]);
  assert.equal(url.searchParams.get('amount'),'300');assert.equal(url.searchParams.get('message'),ids[index]);
  assert.equal(url.hash,'');assert.equal(rows[index].autofill,true);
 }
 await links[1].delivered();assert.equal(rows[0].status,'prepared');assert.equal(rows[1].status,'delivered');
});

test('missing Discord name is explicitly cleared and numeric SteamIDs are refused',async()=>{
 const db={collection:()=>({insertOne:async()=>{}})};
 const input={platform:'discord',actorId:'123',steamId:'76561199244823805',configuredUrl:'https://new.donatepay.ru/donate/RNSquad?name=Previous'};
 const result=await prepareDonationLink(db,input);
 assert.equal(new URL(result.url).searchParams.get('name'),'');
 await assert.rejects(prepareDonationLink(db,{...input,steamId:Number(input.steamId)}),/Invalid donation Steam ID/);
});
test('audit write failure never issues an untracked link',async()=>{
 await assert.rejects(prepareDonationLink({collection:()=>({insertOne:async()=>{throw Error('db unavailable')}})},{platform:'test',actorId:'1',steamId:'76561199244823805',configuredUrl:'https://new.donatepay.ru/@RNSquad'}),/db unavailable/);
});
