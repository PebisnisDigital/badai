const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let PGlite;
try{({PGlite}=require('@electric-sql/pglite'));}
catch(_){({PGlite}=require(process.env.PGLITE_MODULE||'../work/test-tools/node_modules/@electric-sql/pglite'));}

test('SQL scheduler wakes only eligible work, preserves gates and throttling, and never retries uncertain sends',async()=>{
  const db=new PGlite();
  const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
  const value=async(sql,args=[])=>Object.values((await query(sql,args))[0])[0];
  const actor='10000000-0000-4000-8000-000000000001';
  const liveRun='50000000-0000-4000-8000-000000000001',liveJob='60000000-0000-4000-8000-000000000001';
  try{
    // Only the network and cron transports are replaced. All Channel/Group
    // schemas, due-slot generation, authorization, claims and dispatch are real.
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create schema extensions; create schema cron; create schema net;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function extensions.digest(bytea,text) returns bytea language sql immutable as $$ select sha256($1) $$;
      create table public.admin_team_members(auth_user_id uuid,role text,status text);
      create table public.wa_marketing_targets(id uuid primary key,kind text,enabled boolean,external_id text,name text);
      create table public.wa_marketing_connection_secure(id integer,provider_id text,session_secret text,session_epoch uuid);
      create table public.wa_marketing_live_settings(singleton boolean,enabled boolean,testing_enabled boolean,scheduler_enabled boolean,active_job_id uuid,next_send_at timestamptz,min_gap_seconds integer,updated_at timestamptz);
      create table public.wa_marketing_live_runs(id uuid primary key,mode text,status text);
      create table public.wa_marketing_live_jobs(id uuid primary key,run_id uuid,status text,send_after timestamptz,position integer,lease_until timestamptz,claim_token uuid,gap_seconds integer,error_code text,updated_at timestamptz);
      create table public.wa_marketing_live_events(job_id uuid,run_id uuid,event text);
      create table public.test_proofs(kind text,typ text,fp text);
      create function public.wa_live_owner() returns boolean language sql security definer as $$ select exists(select 1 from public.admin_team_members where auth_user_id=auth.uid() and status='active' and role in ('owner','super_admin')) $$;
      revoke all on function public.wa_live_owner() from public,anon,authenticated;
      create function public.wa_live_assert_owner(uuid) returns void language plpgsql security definer as $$ begin if $1 is null or not exists(select 1 from public.admin_team_members where auth_user_id=$1 and status='active' and role in ('owner','super_admin')) then raise exception 'wa_owner_required'; end if; end $$;
      create function public.wa_live_verified(text,text,text) returns boolean language sql security definer as $$ select exists(select 1 from public.test_proofs where kind=$1 and typ=$2 and fp=$3) $$;
      create table public.test_http_outbox(id bigserial primary key,url text,headers jsonb,body jsonb);
      create table public.test_tokens(issued boolean);
      create function public.wa_live_issue_worker_token() returns jsonb language plpgsql as $$ begin insert into public.test_tokens values(true); return '{"x-wa-worker-signature":"fixture"}'::jsonb; end $$;
      create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$ insert into public.test_http_outbox(url,headers,body) values($1,$2,$3) returning id $$;
      create table net._http_response(id bigint primary key,status_code integer);
      create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text);
      create function cron.schedule(text,text,text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname) do update set schedule=$2,command=$3 returning jobid $$;
      create function cron.unschedule(bigint) returns boolean language plpgsql as $$ begin delete from cron.job where jobid=$1; return found; end $$;
      insert into cron.job(jobname,schedule,command) values('badai-wa-live-worker','10 seconds','old HTTP loop'),('unrelated-maintenance','0 * * * *','unrelated SQL');
      insert into auth.users values('${actor}');
      insert into public.admin_team_members values('${actor}','owner','active');
      insert into public.wa_marketing_live_settings values(true,false,true,false,null,'-infinity',30,now());
      insert into public.wa_marketing_connection_secure values(1,'fixture-provider','fixture-secret','70000000-0000-4000-8000-000000000001');
    `);
    // Existing production recovery branch from wa_live_claim. The scheduler
    // may use this only for an expired active lease; a normal claim is a bug.
    await db.exec(`create function public.wa_live_claim() returns jsonb language plpgsql as $$
      declare cfg public.wa_marketing_live_settings; j public.wa_marketing_live_jobs;
      begin
        select * into cfg from public.wa_marketing_live_settings where singleton for update;
        if cfg.active_job_id is not null then
          select * into j from public.wa_marketing_live_jobs where id=cfg.active_job_id for update;
          if j.lease_until>clock_timestamp() then return null; end if;
          update public.wa_marketing_live_jobs set status=case when status='preparing' then 'queued' else 'unknown' end,
            error_code=case when status='dispatching' then 'dispatch_lease_expired' else null end,
            claim_token=null,lease_until=null,updated_at=now() where id=j.id and status in ('preparing','dispatching');
          insert into public.wa_marketing_live_events values(j.id,j.run_id,'lease_expired');
          if j.status='dispatching' then update public.wa_marketing_live_runs set status='paused' where id=j.run_id and status='active'; end if;
          update public.wa_marketing_live_settings set active_job_id=null,
            next_send_at=greatest(next_send_at,clock_timestamp()+make_interval(secs=>greatest(cfg.min_gap_seconds,coalesce(j.gap_seconds,30)))) where singleton;
          return null;
        end if;
        raise exception 'scheduler_must_not_claim_unexpired_jobs';
      end $$;`);
    for(const file of fs.readdirSync(path.join(__dirname,'../supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
      await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
    }
    await query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);
    const dispatch=()=>value('select badai_wa_scheduler.dispatch()');
    const calls=()=>value('select count(*)::int from public.test_http_outbox');
    const lastUrl=()=>value('select url from public.test_http_outbox order by id desc limit 1');
    const completeHttp=()=>db.exec('insert into net._http_response select id,200 from public.test_http_outbox on conflict(id) do update set status_code=200');
    const releaseThrottle=()=>db.exec("update public.wa_marketing_live_settings set next_send_at='-infinity'");

    assert.deepEqual((await query('select jobname from cron.job order by jobname')).map(r=>r.jobname),['badai-wa-dispatcher','unrelated-maintenance']);
    assert.match(await value("select command from cron.job where jobname='badai-wa-dispatcher'"),/badai_wa_scheduler.dispatch/);
    assert.equal(await calls(),0);
    for(let i=0;i<120;i++)assert.equal(await dispatch(),0,'idle testing mode does not wake a function');
    assert.equal(await calls(),0);assert.equal(await value('select count(*)::int from public.test_tokens'),0,'idle checks issue no signed tokens');
    await db.exec('set role authenticated');await assert.rejects(dispatch,/permission denied/);await db.exec('reset role; set role anon');await assert.rejects(dispatch,/permission denied/);await db.exec('reset role');

    // Legacy work respects mode flags, due times, paused runs and HTTP backoff.
    await query("insert into public.wa_marketing_live_runs values($1,'single','active')",[liveRun]);
    await query("insert into public.wa_marketing_live_jobs(id,run_id,status,send_after,position,gap_seconds) values($1,$2,'queued',now(),1,30)",[liveJob,liveRun]);
    assert.equal(await dispatch(),0,'single send is gated while publication is OFF');
    await query("update public.wa_marketing_live_runs set mode='test',status='paused' where id=$1",[liveRun]);assert.equal(await dispatch(),0);
    await query("update public.wa_marketing_live_runs set status='active' where id=$1",[liveRun]);
    await query("update public.wa_marketing_live_jobs set send_after=now()+interval '1 day' where id=$1",[liveJob]);assert.equal(await dispatch(),0,'future job stays asleep');
    await query("update public.wa_marketing_live_jobs set send_after=now() where id=$1",[liveJob]);
    assert.equal(await dispatch(),1);assert.match(await lastUrl(),/badai-wa-send$/);
    const firstCalls=await calls();assert.equal(await dispatch(),0,'pending HTTP request cannot be duplicated');
    await db.exec('insert into net._http_response select id,503 from public.test_http_outbox');assert.equal(await dispatch(),0,'provider/function failure cannot create a poll storm');
    assert.equal(await calls(),firstCalls);
    await db.exec("update badai_wa_scheduler.wakeup set retry_after=now()-interval '1 second'");assert.equal(await dispatch(),1,'unclaimed work may be woken again after bounded backoff');
    await query("update public.wa_marketing_live_jobs set status='unknown' where id=$1",[liveJob]);await completeHttp();
    assert.equal(await dispatch(),0,'uncertain job never wakes a worker again');

    const settings={},contents={};
    for(const kind of ['channel','group']){
      const target=await value('select gen_random_uuid()'),cid=await value('select gen_random_uuid()'),sid=await value('select gen_random_uuid()');
      settings[kind]=sid;contents[kind]=cid;
      await query('insert into public.wa_marketing_targets values($1,$2,true,$3,$4)',[target,kind,kind==='group'?'123456789@g.us':'123456789@newsletter','BADAI '+kind]);
      await query(`insert into public.wa_${kind}_contents(id,title,caption) values($1,'Draft','Caption')`,[cid]);
      await query(`insert into public.wa_${kind}_settings(id,target_id,enabled,duration_days,start_date,timezone,send_times,loop,created_by,activated_at)
        values($1,$2,false,10,current_date,'UTC',array['08:00'::time],true,$3,now())`,[sid,target,actor]);
      await query(`insert into public.wa_${kind}_calendar_slots values($1,1,'08:00',$2)`,[sid,cid]);
      await db.exec(`insert into public.test_proofs select '${kind}','text',badai_${kind}.fingerprint()`);
    }
    // An explicit verification test wakes Group even with publication OFF.
    const testJob=await value("select public.wa_group_send_test($1,1,'08:00',gen_random_uuid(),true)",[settings.group]);
    await db.exec("update public.wa_marketing_live_settings set next_send_at=now()+interval '5 minutes'");
    assert.equal(await dispatch(),0,'a queued test still respects the shared send throttle');
    await releaseThrottle();
    assert.equal(await dispatch(),1);assert.match(await lastUrl(),/badai-wa-group$/);
    assert.equal(await value('select enabled from public.wa_marketing_live_settings'),false);
    await query("update public.wa_group_delivery_logs set status='api_accepted' where id=$1",[testJob.id]);await completeHttp();
    assert.equal(await dispatch(),0,'saving OFF drafts never dispatches a schedule');

    // Real tick functions materialize two due loop slots and keep immutable
    // cycle identities. The worker receives one wake-up, not one per poll.
    await db.exec('update public.wa_marketing_live_settings set enabled=true,scheduler_enabled=true');
    for(const kind of ['channel','group']){
      await query(`update public.wa_${kind}_settings set enabled=true,start_date=current_date-10,activated_at=now()-interval '2 minutes',
        send_times=array[(date_trunc('minute',clock_timestamp())::time)] where id=$1`,[settings[kind]]);
      await query(`update public.wa_${kind}_calendar_slots set send_time=date_trunc('minute',clock_timestamp())::time where settings_id=$1`,[settings[kind]]);
    }
    await releaseThrottle();assert.equal(await dispatch(),1);assert.match(await lastUrl(),/badai-wa-channel$/);
    for(const kind of ['channel','group']){
      assert.equal(await value(`select count(*)::int from public.wa_${kind}_delivery_logs where request_key is null`),1);
      assert.equal(await value(`select cycle_number from public.wa_${kind}_delivery_logs where request_key is null`),2);
    }
    assert.equal(await dispatch(),0,'repeated due tick does not make duplicate HTTP calls or deliveries');
    const claim=await value('select public.wa_channel_claim()');assert.ok(claim?.id);await completeHttp();
    assert.equal(await dispatch(),0,'shared throttle and active preparation block other families');
    await query("update public.wa_channel_delivery_logs set status='dispatching',lease_until=now()-interval '1 second' where id=$1",[claim.id]);
    await releaseThrottle();assert.equal(await dispatch(),1);assert.match(await lastUrl(),/badai-wa-group$/);
    assert.equal(await value('select status from public.wa_channel_delivery_logs where id=$1',[claim.id]),'unknown','abandoned dispatch is settled without a network call or retry');
    const groupClaim=await value('select public.wa_group_claim()');assert.ok(groupClaim?.id);
    await query("update public.wa_group_delivery_logs set lease_until=now()-interval '1 second' where id=$1",[groupClaim.id]);
    await completeHttp();await releaseThrottle();assert.equal(await dispatch(),0);
    assert.equal(await value('select status from public.wa_group_delivery_logs where id=$1',[groupClaim.id]),'failed','expired preparation does not wake another worker');

    // Expired queued occurrences are cancelled locally; loop OFF is completed
    // locally too. Neither needs a network call to discover there is no work.
    await query("update public.wa_channel_delivery_logs set status='queued',created_at=now()-interval '6 minutes' where id=$1",[claim.id]);
    await query('update public.wa_group_settings set loop=false where id=$1',[settings.group]);
    assert.equal(await dispatch(),0);
    assert.equal(await value('select status from public.wa_channel_delivery_logs where id=$1',[claim.id]),'cancelled');
    assert.equal(await value('select enabled from public.wa_group_settings where id=$1',[settings.group]),false);

    // Legacy recovery retains its existing pause-after-uncertainty behavior.
    await query("update public.wa_marketing_live_jobs set status='dispatching',lease_until=now()-interval '1 second' where id=$1",[liveJob]);
    await query('update public.wa_marketing_live_settings set active_job_id=$1',[liveJob]);
    const beforeRecovery=await calls();assert.equal(await dispatch(),0);
    assert.equal(await value('select status from public.wa_marketing_live_jobs where id=$1',[liveJob]),'unknown');
    assert.equal(await value('select status from public.wa_marketing_live_runs where id=$1',[liveRun]),'paused');
    assert.equal(await calls(),beforeRecovery);
    await db.exec('set role service_role');assert.equal(await dispatch(),0);await db.exec('reset role');
    assert.equal(await value('select count(*)::int from public.test_tokens'),await calls(),'only actual wake-ups issue tokens');
  }finally{await db.close();}
});
