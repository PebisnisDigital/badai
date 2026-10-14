import test from 'node:test';
import assert from 'node:assert/strict';
import {signWorkerProof,verifyWorkerProof} from '../supabase/functions/_shared/worker-auth.ts';
const secret='fixture-secret-at-least-32-characters-long',nonce='00000000-0000-4000-8000-000000000009',time=1791950400;
test('worker HMAC binds time and nonce and expires after 30 seconds',async()=>{
  const signature=await signWorkerProof(secret,nonce,time);
  const h=new Headers({'x-wa-worker-nonce':nonce,'x-wa-worker-time':String(time),'x-wa-worker-signature':signature});
  assert.equal(await verifyWorkerProof(h,secret,time*1000),true);
  assert.equal(await verifyWorkerProof(h,secret,(time+31)*1000),false);
  assert.equal(await verifyWorkerProof(h,secret,(time-6)*1000),false);
  assert.equal(await verifyWorkerProof(h,'different-fixture-secret-32-characters',time*1000),false);
  h.set('x-wa-worker-nonce','00000000-0000-4000-8000-000000000010');assert.equal(await verifyWorkerProof(h,secret,time*1000),false);
});
test('raw master credentials are never accepted as queued worker authorization',async()=>{
  assert.equal(await verifyWorkerProof(new Headers({'x-wa-worker-secret':secret}),secret,time*1000),false);
});
