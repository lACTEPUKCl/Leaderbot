import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createTemporaryVoiceManager} from '../events/handleVoiceState.js';
import {safeBotEvent} from '../utility/safeBotEvent.js';
import {isDiscordHost} from '../utility/discordTransport.js';

test('configured admin roles can join private voice channels without admitting unrelated roles',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'leader-voice-admin-'));
 const roles=[{id:'1',name:'@everyone'},{id:'6',name:'SQUAD'},{id:'7',name:'Admins'},{id:'8',name:'Admins'},{id:'9',name:'Guest'}];
 let created;
 const guild={id:'1',roles:{everyone:roles[0],cache:{find:fn=>roles.find(fn),values:()=>roles.values()}},channels:{create:async options=>{created=options;return{id:'11'}}}};
 const manager=createTemporaryVoiceManager({}, {channelIdToCreateChannel:'2',categoryIdForCreateChannel:'4',adminsRoleName:['Admins','SQUAD','@everyone','']},{stateFile:path.join(dir,'state.json')});
 try {
  await manager.handle({channelId:null},{guild,id:'5',channelId:'2',member:{displayName:'Guest',voice:{channelId:'2'}},setChannel:async()=>{
   for(const id of ['6','7','8'])assert.deepEqual(created.permissionOverwrites.find(row=>row.id===id).allow,['ViewChannel','Connect','Speak']);
  }});
  assert.deepEqual(created.permissionOverwrites.find(row=>row.id==='1'),{id:'1',deny:['ViewChannel']});
  assert.equal(created.permissionOverwrites.some(row=>row.id==='9'),false);
  assert.equal(new Set(created.permissionOverwrites.map(row=>row.id)).size,created.permissionOverwrites.length);
  assert.ok(created.permissionOverwrites.find(row=>row.id==='5').allow.includes('Connect'));
 } finally {fs.rmSync(dir,{recursive:true,force:true})}
});

test('Discord routing cannot capture unrelated hosts or lookalike suffixes',()=>{
 for(const host of ['gateway.discord.gg','discord.com','cdn.discordapp.com'])assert.equal(isDiscordHost(host),true);
 for(const host of ['api.steampowered.com','api.telegram.org','discord.com.evil.test','notdiscord.gg'])assert.equal(isDiscordHost(host),false);
});
test('async interaction failure is contained instead of becoming an unhandled client error',async()=>{
 const logs=[];await safeBotEvent('interaction',async()=>{throw Object.assign(new Error('secret'),{code:10062});},{error:x=>logs.push(x)})();
 assert.deepEqual(logs,['[BOT] interaction failed: 10062']);
});
test('temporary voice registry survives restart, retries deletion and never touches permanent or occupied channels',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'leader-voice-')); const stateFile=path.join(dir,'state.json');
 const records=['11','12','13'].map(id=>({kind:'leaderbot-temp-v1',id,guildId:'1',parentId:'4',createdAt:0}));
 fs.writeFileSync(stateFile,JSON.stringify({version:1,channels:records}));
 let calls=0;let failing=true;const channels=new Map([
 ['11',{type:2,parentId:'4',members:new Map(),delete:async()=>{calls++;if(failing)throw {code:50013};}}],
 ['12',{type:2,parentId:'4',members:new Map([['a',{}]]),delete:async()=>assert.fail('occupied')}],
 ['13',{type:2,parentId:'9',members:new Map(),delete:async()=>assert.fail('moved')}],
 ['99',{type:2,parentId:'4',members:new Map(),delete:async()=>assert.fail('permanent')}]]);
 const guild={available:true,channels:{fetch:async id=>channels.get(id)},voiceStates:{cache:{some:()=>false}}};
 const client={isReady:()=>true,guilds:{cache:new Map([['1',guild]])}};
 const args=[client,{channelIdToCreateChannel:'2',categoryIdForCreateChannel:'4'},{stateFile,now:()=>60000,logger:{error:()=>{}}}];
 const first=createTemporaryVoiceManager(...args);await first.sweep();assert.equal(first.records.has('11'),true);
 failing=false;const restarted=createTemporaryVoiceManager(...args);await restarted.sweep();assert.equal(calls,2);assert.equal(restarted.records.has('11'),false);assert.equal(restarted.records.size,2);
 fs.rmSync(dir,{recursive:true,force:true});
});

test('voice creation is deduplicated and permissions are set before moving the member',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'leader-voice-'));const stateFile=path.join(dir,'state.json');let creates=0;let release;
 const waiting=new Promise(r=>{release=r});const member={displayName:'Guest',voice:{channelId:'2'}};
 const guild={id:'1',available:true,roles:{everyone:{id:'1'},cache:{find:()=>null,values:()=>[][Symbol.iterator]()}},channels:{create:async options=>{creates++;assert.equal(options.permissionOverwrites.length,2);await waiting;return{id:'11'};}},voiceStates:{cache:{some:()=>false}}};
 const manager=createTemporaryVoiceManager({isReady:()=>true,guilds:{cache:new Map([['1',guild]])}},{channelIdToCreateChannel:'2',categoryIdForCreateChannel:'4'},{stateFile});
 const state={guild,id:'5',member,channelId:'2',setChannel:async()=>{assert.equal(JSON.parse(fs.readFileSync(stateFile)).channels[0].id,'11');member.voice.channelId='11';}};
 const first=manager.handle({channelId:null},state);await manager.handle({channelId:null},state);release();await first;assert.equal(creates,1);
 fs.rmSync(dir,{recursive:true,force:true});
});
