import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const port=31879,base='http://127.0.0.1:'+port,token='local-test-token-more-than-20-characters';
const child=spawn(process.execPath,['server/server.js'],{cwd,env:{...process.env,PORT:String(port),TINYFISH_API_KEY:'not-a-real-key',LEAKLENS_ACCESS_TOKEN:token,TINYFISH_ALLOWED_URLS:'https://vendor.example/pricing'},stdio:['ignore','pipe','pipe']});
try{
 await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server did not start')),4000))]);
 await test('local server serves entry and JavaScript',async()=>{for(const file of ['/','/JavaScript/app.js']){const r=await fetch(base+file);assert.equal(r.status,200);assert.ok((await r.text()).length>50);}});
 await test('server refuses secrets and backend-source downloads',async()=>{for(const file of ['/.env','/.env.example','/server/server.js','/README.md']){assert.equal((await fetch(base+file)).status,404);}});
 await test('lookup needs a valid local token',async()=>{const r=await fetch(base+'/api/vendor-lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401);});
 await test('unapproved URL is rejected without provider request',async()=>{const r=await fetch(base+'/api/vendor-lookup',{method:'POST',headers:{'Content-Type':'application/json','X-LeakLens-Token':token},body:JSON.stringify({vendor:'Test',plan:'Test',url:'https://not-approved.example/pricing'})});assert.equal(r.status,400);assert.match((await r.json()).error,/exact HTTPS/);});
}finally{child.kill();}
