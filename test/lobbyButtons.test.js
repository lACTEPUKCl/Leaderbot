import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesLobbyMessage, buildRow, editMessage} from '../utility/lobbyButtons.js';

test('Wardogs message cannot be reused for Squad, and other authors are ignored',()=>{
 const message={author:{id:'bot'},content:'**Wardogs | Русский Народный Сервер**\n\nInstructions'};
 assert.equal(matchesLobbyMessage(message,'bot','Русский Народный Сервер'),false);
 assert.equal(matchesLobbyMessage(message,'bot','Wardogs | Русский Народный Сервер'),true);
 assert.equal(matchesLobbyMessage(message,'other','Wardogs | Русский Народный Сервер'),false);
});
test('Squad and Wardogs use separate HTTP redirect endpoints',()=>{
 for(const [path,expected] of [[undefined,'/api/sqb/join-link'],['/api/wardogs/join-link','/api/wardogs/join-link']]){
  const row=buildRow([{name:'RNS | #1',label:'Join',path}],'https://rnserver.ru/').toJSON();
  const url=new URL(row.components[0].url);
  assert.equal(url.pathname,expected);assert.equal(url.searchParams.get('name'),'RNS | #1');
 }
 assert.throws(()=>buildRow([{name:'Wardogs'}],'https://user:secret@example.org'));
});
test('Unchanged buttons skip edits; failed updates remain retryable',async()=>{
 let calls=0;let fail=true;
 const message={edit:async()=>{calls++;if(fail)throw Error('temporary');}};
 const group={tag:'wardogs',servers:[{name:'Wardogs',path:'/api/wardogs/join-link'}]};
 await assert.rejects(editMessage(message,group,'https://rnserver.ru'));
 fail=false;
 await editMessage(message,group,'https://rnserver.ru');
 await editMessage(message,group,'https://rnserver.ru');
 assert.equal(calls,2);
 await editMessage(message,group,'https://example.org');
 assert.equal(calls,3);
});
