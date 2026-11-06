import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {fetchJson} from '../utility/fetchJson.js';
import {startBackgroundTask} from '../utility/backgroundTask.js';
test('aborts stalled response body and releases the donation task for retry', async () => {
 const sockets=new Set();let requests=0;
 const server=http.createServer((req,res)=>{requests++;res.writeHead(200,{'Content-Type':'application/json'});res.write('{');});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let failures=0;const job=startBackgroundTask('test',()=>fetchJson(`http://127.0.0.1:${server.address().port}`,{timeoutMs:40}),{intervalMs:100000,logger:{info(){},error(){failures++;}}});
 try{await new Promise(r=>setTimeout(r,120));await job.run();assert.equal(requests,2);assert.equal(failures,2);}finally{job.stop();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
});
test('rejects HTTP failure without parsing a provider HTML response',async()=>{
 await assert.rejects(fetchJson('https://example.invalid',{fetchImpl:async()=>({ok:false,status:503})}),/HTTP 503/);
});
