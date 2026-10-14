import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

// Uses a dedicated disposable database in an explicitly selected local container.
// No host port, production URL, token, or live provider is used by these tests.
const container=process.env.WA_TEST_DB_CONTAINER||'badai-wa-test-db';
const database='badai_wa_test_'+process.pid+'_'+Date.now();
const dockerEnv={...process.env};for(const name of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[name];
function args(db=database){return ['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-X','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','-Atq'];}
function sql(text,db=database){const r=spawnSync('docker',args(db),{input:text,encoding:'utf8',env:dockerEnv});if(r.status!==0)throw Error(r.stderr||r.error?.message);return r.stdout.trim();}
function concurrent(text){return new Promise((resolve,reject)=>{const p=spawn('docker',args(),{env:dockerEnv});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(Error(err)));p.stdin.end(text);});}
const owner='00000000-0000-4000-8000-000000000001',campaign='00000000-0000-4000-8000-000000000002',target='00000000-0000-4000-8000-000000000003',target2='00000000-0000-4000-8000-000000000004',fp='a'.repeat(64);
function enqueue(mode='test',key=randomUUID(),targets=[target]){return JSON.parse(sql(`select public.wa_live_enqueue('${owner}','${campaign}',ARRAY[${targets.map(t=>"'"+t+"'::uuid").join(',')}],'${mode}','${key}','${fp}');`));}
function claim(){return JSON.parse(sql('select public.wa_live_claim();')||'null');}
function dispatch(j,fingerprint=fp){return sql(`select public.wa_live_dispatch('${j.id}','${j.claim_token}','${fingerprint}');`)==='t';}
function settle(j,status='api_accepted'){return sql(`select public.wa_live_settle('${j.id}','${j.claim_token}','${status}',${status==='api_accepted'?"'FIXTURE_PROVIDER_ID'":'null'},200,null);`);}
function jobs(){return JSON.parse(sql('select coalesce(json_agg(j order by position),\'[]\') from public.wa_marketing_live_jobs j;'));}
function finishAndConfirm(j){assert.equal(dispatch(j),true);settle(j);sql(`select public.wa_live_confirm('${owner}','${j.id}','Fixture recipient observed exact test message',clock_timestamp());`);}

before(()=>{
  sql(`create database ${database};`,'postgres');
  sql(readFileSync(new URL('./fixtures/wa-marketing-schema.sql',import.meta.url),'utf8'));
  sql(readFileSync(new URL('../supabase/migrations/20261014090000_wa_live_delivery.sql',import.meta.url),'utf8'));
  sql(readFileSync(new URL('../supabase/migrations/20261014100000_wa_worker_proofs.sql',import.meta.url),'utf8'));
});
after(()=>{sql(`drop database if exists ${database} with(force);`,'postgres');});
beforeEach(()=>{
  sql(`truncate public.wa_marketing_live_verifications,public.wa_marketing_live_events,public.wa_marketing_live_jobs,public.wa_marketing_live_runs,public.wa_marketing_live_test_targets,public.admin_team_members,public.wa_marketing_campaign_targets,public.wa_marketing_campaigns,public.wa_marketing_targets,public.wa_marketing_delivery_plan;
    update public.wa_marketing_live_settings set enabled=false,testing_enabled=true,scheduler_enabled=false,active_job_id=null,next_send_at='-infinity';
    insert into public.admin_team_members values('${owner}','owner','active');
    insert into public.wa_marketing_targets values('${target}','Private test','group','120363123456789012@g.us',true,'manual'),('${target2}','Second private test','group','120363123456789013@g.us',true,'manual');
    insert into public.wa_marketing_campaigns(id,name,content_text,delivery_mode,status,delay_seconds,delay_min_seconds,delay_max_seconds,message_type) values('${campaign}','Test campaign','Unique fixture test text','now_test','draft',30,30,60,'text');
    insert into public.wa_marketing_campaign_targets values('${campaign}','${target}',0,null),('${campaign}','${target2}',1,null);
    insert into public.wa_marketing_delivery_plan values('${campaign}','planned');
    insert into public.wa_marketing_live_test_targets(target_id,approved_by,approval_note,enabled) values('${target}','${owner}','Explicit fixture private-group test approval',true);`);
});

test('features default closed, legacy plans are never imported into live queue',()=>{
  assert.throws(()=>enqueue('single'),/wa_sending_disabled/);
  sql('update public.wa_marketing_live_settings set testing_enabled=false;');
  assert.throws(()=>enqueue(),/wa_sending_disabled/);
  assert.equal(jobs().length,0);assert.equal(sql('select status from public.wa_marketing_delivery_plan;'),'planned');
});
test('unapproved targets, non-owners and unverified Channel/media tests are rejected',()=>{
  assert.throws(()=>enqueue('test',randomUUID(),[target2]),/wa_test_target_not_approved/);
  sql(`update public.admin_team_members set role='marketing';`);assert.throws(()=>enqueue(),/wa_owner_required/);
  sql(`update public.admin_team_members set role='owner'; update public.wa_marketing_targets set kind='channel',external_id='120363123456789012@newsletter' where id='${target}';`);
  assert.throws(()=>enqueue(),/wa_group_text_test_required/);
});
test('same request key returns the existing run and same content cannot be sent again',()=>{
  const key=randomUUID(),first=enqueue('test',key),second=enqueue('test',key);
  assert.equal(first.run_id,second.run_id);assert.equal(second.duplicate,true);assert.equal(jobs().length,1);
  const j=claim();finishAndConfirm(j);
  assert.throws(()=>enqueue('test'),/wa_content_already_queued/);
});
test('concurrent duplicate requests create exactly one run/job',async()=>{
  const key=randomUUID(),statement=`select public.wa_live_enqueue('${owner}','${campaign}',ARRAY['${target}'::uuid],'test','${key}','${fp}');`;
  const responses=await Promise.all([concurrent(statement),concurrent(statement)]);
  assert.equal(JSON.parse(responses[0]).run_id,JSON.parse(responses[1]).run_id);assert.equal(jobs().length,1);
});
test('concurrent workers obtain one durable claim and one dispatch attempt',async()=>{
  enqueue();const responses=await Promise.all([concurrent('select public.wa_live_claim();'),concurrent('select public.wa_live_claim();')]);
  const claims=responses.map(s=>JSON.parse(s||'null')).filter(Boolean);assert.equal(claims.length,1);
  assert.equal(dispatch(claims[0]),true);assert.equal(dispatch(claims[0]),false);assert.equal(jobs()[0].attempts,1);
});
test('pause before dispatch prevents sending; cancellation leaves legacy plan untouched',()=>{
  const run=enqueue(),j=claim();sql(`select public.wa_live_control('${owner}','${run.run_id}','pause');`);
  assert.equal(dispatch(j),false);settle(j,'cancelled');
  assert.equal(jobs()[0].attempts,0);assert.equal(sql('select status from public.wa_marketing_delivery_plan;'),'planned');
});
test('a lost response or expired dispatch is unknown, pauses run, and is never reclaimed',()=>{
  const run=enqueue(),j=claim();assert.equal(dispatch(j),true);
  sql(`update public.wa_marketing_live_jobs set lease_until=clock_timestamp()-interval '1 second' where id='${j.id}';`);
  assert.equal(claim(),null);assert.equal(jobs()[0].status,'unknown');assert.equal(jobs()[0].attempts,1);
  sql(`update public.wa_marketing_live_settings set next_send_at='-infinity';`);assert.equal(claim(),null);
  assert.equal(sql(`select status from public.wa_marketing_live_runs where id='${run.run_id}';`),'paused');
  assert.throws(()=>sql(`select public.wa_live_control('${owner}','${run.run_id}','resume');`),/wa_uncertain_delivery_requires_review/);
});
test('expired preparation can be reclaimed safely with a new claim token',()=>{
  enqueue();const old=claim();sql(`update public.wa_marketing_live_jobs set lease_until=clock_timestamp()-interval '1 second' where id='${old.id}';`);
  assert.equal(claim(),null);sql(`update public.wa_marketing_live_settings set next_send_at='-infinity';`);
  const current=claim();assert.equal(current.id,old.id);assert.notEqual(current.claim_token,old.claim_token);assert.equal(dispatch(old),false);assert.equal(dispatch(current),true);
});
test('a changed draft invalidates queued snapshots and protects a prepared job even after resume',()=>{
  const run=enqueue(),j=claim();sql(`update public.wa_marketing_campaigns set content_text='Changed content' where id='${campaign}'; select public.wa_live_control('${owner}','${run.run_id}','resume');`);
  assert.equal(dispatch(j),false);assert.equal(jobs()[0].attempts,0);
});
test('revoking owner access or rotating session prevents dispatch',()=>{
  enqueue();const j=claim();assert.equal(dispatch(j,'b'.repeat(64)),false);
  sql(`update public.admin_team_members set status='inactive';`);assert.equal(dispatch(j),false);
});
test('API acceptance does not verify a destination; real recipient confirmation is required',()=>{
  enqueue();const j=claim();assert.equal(dispatch(j),true);settle(j);
  assert.equal(jobs()[0].status,'api_accepted');assert.equal(sql('select count(*) from public.wa_marketing_live_verifications;'),'0');
  assert.throws(()=>sql(`select public.wa_live_confirm('${owner}','${j.id}','ok',clock_timestamp());`),/wa_delivery_evidence_required/);
  sql(`select public.wa_live_confirm('${owner}','${j.id}','Fixture recipient observed exact test message',clock_timestamp());`);
  assert.equal(jobs()[0].status,'delivered');assert.equal(sql('select count(*) from public.wa_marketing_live_verifications;'),'1');
  assert.equal(sql(`select public.wa_live_verified('group','text','${'b'.repeat(64)}');`),'f');
});
test('scheduled jobs snapshot targets and sample bounded server-side gaps',()=>{
  enqueue();finishAndConfirm(claim());
  sql(`update public.wa_marketing_campaigns set content_text='Scheduled fixture content',delivery_mode='scheduled',scheduled_at=clock_timestamp()+interval '1 hour' where id='${campaign}'; update public.wa_marketing_live_settings set enabled=true,scheduler_enabled=true;`);
  enqueue('scheduled',randomUUID(),[target,target2]);const scheduled=jobs().filter(j=>j.status==='queued');assert.equal(scheduled.length,2);
  for(const j of scheduled)assert.ok(j.gap_seconds>=30&&j.gap_seconds<=60);
  const difference=(new Date(scheduled[1].send_after)-new Date(scheduled[0].send_after))/1000;
  assert.equal(difference,scheduled[0].gap_seconds);assert.equal(claim(),null);
});
test('browser roles cannot read secure state, mutate queues, or spoof owner RPCs',()=>{
  assert.throws(()=>sql('set role anon; select * from public.wa_marketing_live_jobs;'),/permission denied/);
  assert.throws(()=>sql(`set role authenticated; select public.wa_live_enqueue('${owner}','${campaign}',ARRAY['${target}'::uuid],'test','${randomUUID()}','${fp}');`),/permission denied/);
  assert.throws(()=>sql('set role authenticated; update public.wa_marketing_live_settings set enabled=true;'),/permission denied/);
});
test('fixed per-recipient overrides control the preceding gap and scheduled due time',()=>{
  enqueue();finishAndConfirm(claim());
  sql(`update public.wa_marketing_campaigns set content_text='Override schedule fixture',delivery_mode='scheduled',scheduled_at=clock_timestamp()+interval '1 hour' where id='${campaign}'; update public.wa_marketing_campaign_targets set delay_seconds=90 where campaign_id='${campaign}' and target_id='${target2}'; update public.wa_marketing_live_settings set enabled=true,scheduler_enabled=true;`);
  enqueue('scheduled',randomUUID(),[target,target2]);const scheduled=jobs().filter(j=>j.status==='queued');
  assert.equal((new Date(scheduled[1].send_after)-new Date(scheduled[0].send_after))/1000,90);assert.equal(scheduled[0].gap_seconds,90);
});
test('worker operation tokens contain no master credential and can be consumed only once',async()=>{
  const headers=JSON.parse(sql('select public.wa_live_issue_worker_token();'));
  assert.ok(!JSON.stringify(headers).includes('fixture-secret'));
  assert.match(headers['x-wa-worker-signature'],/^[a-f0-9]{64}$/);
  const {signWorkerProof}=await import('../supabase/functions/_shared/worker-auth.ts');
  assert.equal(headers['x-wa-worker-signature'],await signWorkerProof('fixture-secret-at-least-32-characters-long',headers['x-wa-worker-nonce'],Number(headers['x-wa-worker-time'])));
  const statement=`select public.wa_live_consume_worker_token('${headers['x-wa-worker-nonce']}',${headers['x-wa-worker-time']});`;
  const outcomes=await Promise.all([concurrent(statement),concurrent(statement)]);assert.deepEqual(outcomes.sort(),['f','t']);
  assert.throws(()=>sql('set role authenticated; select public.wa_live_issue_worker_token();'),/permission denied/);
});
