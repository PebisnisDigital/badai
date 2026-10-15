import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChannelWorker } from '../supabase/functions/_shared/channel-worker.ts';
import { signWorkerProof } from '../supabase/functions/_shared/worker-auth.ts';
import { fingerprint } from '../supabase/functions/_shared/zawa.ts';

const secret='fixture-worker-secret-with-at-least-32-characters';
const credentials={provider_id:'fixture-provider',session_secret:'fixture-session',session_epoch:'fixture-epoch'};
async function setup(options={}){
  let submissions=0;const settlements=[],routes=[];
  const fp=await fingerprint(credentials);
  const job={id:'job',claim_token:'claim',session_fingerprint:options.sessionChanged?'0'.repeat(64):fp,snapshot:{kind:'channel',external_id:'123456789@newsletter',content_text:'Konten BADAI',message_type:'text'}};
  const fetcher=async(url,init={})=>{
    routes.push(url);const body=init.body?JSON.parse(init.body):{};
    const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    if(url.endsWith('/rpc/wa_live_consume_worker_token'))return response(!options.replay);
    if(url.endsWith('/rpc/wa_channel_tick'))return response(0);
    if(url.endsWith('/rpc/wa_channel_claim'))return response(options.empty?null:job);
    if(url.includes('/wa_marketing_connection_secure?'))return response([credentials]);
    if(url.endsWith('/session'))return response({isConnected:options.disconnected?false:true});
    if(url.endsWith('/channel'))return response({docs:[{id:'123456789@newsletter',isOwner:!options.notOwner}]});
    if(url.endsWith('/rpc/wa_channel_dispatch'))return response(!options.cancelled);
    if(url.endsWith('/message')){
      submissions++;
      if(options.timeout)throw new TypeError('network timeout');
      return response(options.rejected?{statusCode:400,message:'validation failed'}:{messageId:'provider-123'},options.rejected?400:200);
    }
    if(url.endsWith('/rpc/wa_channel_settle')){settlements.push(body);if(options.settleFails)throw Error('storage unavailable');return response(null);}
    throw Error('Unexpected URL '+url);
  };
  const handler=createChannelWorker({base:'https://fixture.supabase.co',serviceKey:'fixture-service',workerSecret:secret},fetcher);
  const request=async(valid=true)=>{
    const nonce='10000000-0000-4000-8000-000000000001',time=Math.floor(Date.now()/1000);
    const signature=await signWorkerProof(secret,nonce,time);
    return handler(new Request('https://fixture.supabase.co/functions/v1/badai-wa-channel',{method:'POST',headers:valid?{'Content-Type':'application/json','x-wa-worker-nonce':nonce,'x-wa-worker-time':String(time),'x-wa-worker-signature':signature}:{},body:JSON.stringify({action:'worker'})}));
  };
  return {request,settlements,routes,submissions:()=>submissions};
}
test('worker rejects unsigned requests and replayed proofs',async()=>{
  const a=await setup();assert.equal((await a.request(false)).status,403);assert.equal(a.routes.length,0);
  const b=await setup({replay:true});assert.equal((await b.request()).status,403);assert.equal(b.submissions(),0);
});
test('empty queue does not contact Zawa',async()=>{const a=await setup({empty:true});assert.equal((await a.request()).status,200);assert.equal(a.submissions(),0);assert.equal(a.routes.some(r=>r.includes('api-zawa')),false);});
for(const scenario of ['sessionChanged','disconnected','notOwner','cancelled']){
  test('worker checks '+scenario+' before publishing',async()=>{const a=await setup({[scenario]:true});await a.request();assert.equal(a.submissions(),0);assert.equal(a.settlements[0].p_status,scenario==='cancelled'?'cancelled':'failed');});
}
test('successful submission records API acceptance without claiming delivery',async()=>{
  const a=await setup();const r=await a.request();assert.deepEqual(await r.json(),{processed:true});assert.equal(a.submissions(),1);
  assert.equal(a.settlements[0].p_status,'api_accepted');assert.deepEqual(a.settlements[0].p_response,{http_status:200,message_id:'provider-123',error_code:null});
  assert.equal(JSON.stringify(a.settlements).includes('fixture-session'),false);
});
test('provider timeout is UNKNOWN and makes exactly one POST',async()=>{const a=await setup({timeout:true});await a.request();assert.equal(a.submissions(),1);assert.equal(a.settlements[0].p_status,'unknown');});
test('documented provider rejection is FAILED',async()=>{const a=await setup({rejected:true});await a.request();assert.equal(a.submissions(),1);assert.equal(a.settlements[0].p_status,'failed');});
test('persistence failure after POST never attempts a second send or overwrites uncertainty',async()=>{const a=await setup({settleFails:true});await a.request();assert.equal(a.submissions(),1);assert.equal(a.settlements.length,1);});
