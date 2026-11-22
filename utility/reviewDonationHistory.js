import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MongoClient} from 'mongodb';
import 'dotenv/config';
import { mismatchCandidates, windowMs } from './donationRecipientReview.js';

// Read-only: older records are delivered menu links, not confirmed DonatePay clicks.
const client=new MongoClient(process.env.DATABASE_URL);
try {
  const audit=client.db('SquadJS').collection('donationLinkAudit');
  const events=await audit.find({platform:'discord',status:'delivered'},{projection:{actorId:1,steamId:1,selectedAt:1,deliveredAt:1}}).toArray();
  const earliest=Math.min(...events.map(e=>+e.deliveredAt));
  const history=JSON.parse(await fs.readFile('transaction/transactionId.json','utf8')).transactions;
  const candidatesById=new Map(), seen=new Set(), previous=new Map(), receipts=[];
  let missingClaim=0;
  for(const row of history.filter(r=>r.steamID && !r.error)) {
    const id=String(row.id);
    if(seen.has(id)) continue;
    seen.add(id);
    const filename=createHash('sha256').update(id).digest('hex')+'.json';
    try {
      const claim=JSON.parse(await fs.readFile('transaction/claims/'+filename,'utf8'));
      const at=new Date(claim.claimedAt);
      if(+at>=earliest) receipts.push({id,at,steamId:row.steamID});
    } catch(e) {if(e.code!=='ENOENT') throw e;missingClaim++;}
  }
  for(const r of receipts.sort((a,b)=>a.at-b.at)) {
    const recent=events.filter(e=>{const t=e.selectedAt||e.deliveredAt;return t<=r.at && +r.at- +t<=windowMs;});
    const explicit=recent.filter(e=>e.selectedAt);
    const basis=explicit.length?explicit:recent.map(e=>({...e,selectedAt:e.deliveredAt}));
    const repeated= +r.at-(previous.get(r.steamId)??-Infinity)<=windowMs;
    previous.set(r.steamId,+r.at);
    const people=mismatchCandidates(basis,r.steamId,r.at,{repeated});
    if(people.length)candidatesById.set(r.id,{...r,basis:explicit.length?'click':'issued',candidates:people});
  }
  const id=process.argv[2];
  console.log(JSON.stringify({firstAudit:Number.isFinite(earliest)?new Date(earliest):null,checked:receipts.length,
    missingClaim,flagged:candidatesById.size,requested:id?candidatesById.get(id)||null:undefined},null,2));
}finally{await client.close();}
