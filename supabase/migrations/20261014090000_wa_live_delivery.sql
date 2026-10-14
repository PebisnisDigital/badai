-- Additive: never activates legacy campaigns, plans, or a worker.
-- Audit the live schema/functions before applying this migration in production.
begin;

alter table public.wa_marketing_campaigns add column if not exists wa_media_duration_seconds numeric
  check (wa_media_duration_seconds is null or wa_media_duration_seconds>0);

create table public.wa_marketing_live_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  testing_enabled boolean not null default false,
  scheduler_enabled boolean not null default false,
  min_gap_seconds integer not null default 30 check (min_gap_seconds between 30 and 3600),
  active_job_id uuid,
  next_send_at timestamptz not null default '-infinity',
  updated_at timestamptz not null default now()
);
insert into public.wa_marketing_live_settings(singleton) values(true);

create table public.wa_marketing_live_test_targets (
  target_id uuid primary key,
  approved_by uuid not null,
  approval_note text not null check (length(approval_note) between 10 and 2000),
  approved_at timestamptz not null default now(),
  enabled boolean not null default false
);

create table public.wa_marketing_live_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  created_by uuid not null,
  request_key uuid not null,
  mode text not null check (mode in ('test','single','scheduled')),
  status text not null default 'active' check (status in ('active','paused','cancelled','finished')),
  created_at timestamptz not null default now(),
  unique(created_by,request_key)
);
create table public.wa_marketing_live_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.wa_marketing_live_runs(id),
  campaign_id uuid not null,
  target_id uuid not null,
  target_name text not null,
  target_kind text not null check (target_kind in ('group','channel','status')),
  message_type text not null check (message_type in ('text','image','video','document')),
  snapshot jsonb not null,
  snapshot_hash text not null,
  session_fingerprint text not null check (session_fingerprint ~ '^[0-9a-f]{64}$'),
  position integer not null,
  send_after timestamptz not null,
  gap_seconds integer not null check (gap_seconds between 30 and 3600),
  status text not null default 'queued' check (status in ('queued','preparing','dispatching','api_accepted','delivered','failed','unknown','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 1),
  claim_token uuid,
  lease_until timestamptz,
  dispatch_started_at timestamptz,
  provider_message_id text,
  provider_http_status integer,
  error_code text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  confirmed_by uuid,
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id,snapshot_hash),
  unique(run_id,position)
);
create index wa_live_jobs_due on public.wa_marketing_live_jobs(send_after) where status='queued';
create table public.wa_marketing_live_verifications (
  target_kind text not null check (target_kind in ('group','channel','status')),
  message_type text not null check (message_type in ('text','image','video','document')),
  session_fingerprint text not null,
  job_id uuid not null references public.wa_marketing_live_jobs(id),
  verified_by uuid not null,
  verified_at timestamptz not null default now(),
  primary key(target_kind,message_type,session_fingerprint)
);
create table public.wa_marketing_live_events (
  id bigint generated always as identity primary key,
  job_id uuid references public.wa_marketing_live_jobs(id),
  run_id uuid references public.wa_marketing_live_runs(id),
  actor_id uuid,
  event text not null,
  occurred_at timestamptz not null default now()
);

create function public.wa_live_owner() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.admin_team_members where auth_user_id=auth.uid() and status='active' and role in ('owner','super_admin'));
$$;
create function public.wa_live_assert_owner(p_actor uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_actor is null or not exists(select 1 from public.admin_team_members where auth_user_id=p_actor and status='active' and role in ('owner','super_admin')) then
    raise exception 'wa_owner_required' using errcode='42501';
  end if;
end $$;

-- Browser has no direct table/RPC access; the authenticated Edge handler exposes
-- a restricted history projection. Internal mutations are service-role only.
alter table public.wa_marketing_live_settings enable row level security;
alter table public.wa_marketing_live_test_targets enable row level security;
alter table public.wa_marketing_live_runs enable row level security;
alter table public.wa_marketing_live_jobs enable row level security;
alter table public.wa_marketing_live_verifications enable row level security;
alter table public.wa_marketing_live_events enable row level security;
revoke all on public.wa_marketing_live_settings,public.wa_marketing_live_test_targets,public.wa_marketing_live_runs,public.wa_marketing_live_jobs,public.wa_marketing_live_verifications,public.wa_marketing_live_events from anon,authenticated;
grant all on public.wa_marketing_live_settings,public.wa_marketing_live_test_targets,public.wa_marketing_live_runs,public.wa_marketing_live_jobs,public.wa_marketing_live_verifications,public.wa_marketing_live_events to service_role;
grant usage,select on sequence public.wa_marketing_live_events_id_seq to service_role;

create function public.wa_live_verified(p_kind text,p_type text,p_fingerprint text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.wa_marketing_live_verifications v join public.wa_marketing_live_jobs j on j.id=v.job_id
    where v.target_kind=p_kind and v.message_type=p_type and v.session_fingerprint=p_fingerprint
      and j.status='delivered' and j.evidence is not null);
$$;

create function public.wa_live_enqueue(p_actor uuid,p_campaign_id uuid,p_target_ids uuid[],p_mode text,p_request_key uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  cfg public.wa_marketing_live_settings; c public.wa_marketing_campaigns; t public.wa_marketing_targets;
  existing public.wa_marketing_live_runs; run_id uuid; row_id uuid; snap jsonb; typ text;
  lo integer; hi integer; gap integer; override_gap integer; ordinal integer:=0; due timestamptz; target uuid; previous public.wa_marketing_live_jobs;
begin
  perform public.wa_live_assert_owner(p_actor);
  if p_request_key is null or p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'wa_invalid_request'; end if;
  -- Serialize enqueue and configuration/claim operations, including repeated keys.
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  select * into existing from public.wa_marketing_live_runs where created_by=p_actor and request_key=p_request_key;
  if found then
    if existing.campaign_id<>p_campaign_id or existing.mode<>p_mode then raise exception 'wa_request_key_conflict'; end if;
    return jsonb_build_object('run_id',existing.id,'duplicate',true);
  end if;
  if p_mode not in ('test','single','scheduled') or p_mode is null then raise exception 'wa_invalid_mode'; end if;
  if coalesce(cardinality(p_target_ids),0)=0 or cardinality(p_target_ids)>100 or exists(select 1 from unnest(p_target_ids) x group by x having count(*)>1) then raise exception 'wa_invalid_targets'; end if;
  if p_mode in ('test','single') and cardinality(p_target_ids)<>1 then raise exception 'wa_one_target_required'; end if;
  if (p_mode='test' and not cfg.testing_enabled) or (p_mode<>'test' and not cfg.enabled) or (p_mode='scheduled' and not cfg.scheduler_enabled) then raise exception 'wa_sending_disabled'; end if;
  select * into c from public.wa_marketing_campaigns where id=p_campaign_id;
  if not found or c.status='paused' then raise exception 'wa_campaign_unavailable'; end if;
  if exists(select 1 from public.wa_marketing_live_runs where campaign_id=c.id and status in ('active','paused')) then raise exception 'wa_run_already_exists'; end if;
  lo:=coalesce(c.delay_min_seconds,c.delay_seconds,30); hi:=coalesce(c.delay_max_seconds,lo);
  if lo<30 or hi<lo or hi>3600 then raise exception 'wa_invalid_delay'; end if;
  due:=clock_timestamp();
  if p_mode='scheduled' then
    if c.scheduled_at is null or c.scheduled_at<=clock_timestamp() then raise exception 'wa_future_schedule_required'; end if;
    due:=c.scheduled_at;
  end if;
  run_id:=gen_random_uuid();
  insert into public.wa_marketing_live_runs(id,campaign_id,created_by,request_key,mode) values(run_id,c.id,p_actor,p_request_key,p_mode);
  foreach target in array p_target_ids loop
    select * into t from public.wa_marketing_targets where id=target;
    if not found or not t.enabled then raise exception 'wa_target_disabled'; end if;
    if not exists(select 1 from public.wa_marketing_campaign_targets where campaign_id=c.id and target_id=t.id) then raise exception 'wa_target_not_selected'; end if;
    typ:=case when c.message_type='text' then 'text'
      when c.media_path ~* '\.(jpg|jpeg|png|webp)$' then 'image'
      when c.media_path ~* '\.mp4$' then 'video'
      when c.media_path ~* '\.pdf$' then 'document' else null end;
    if typ is null or (t.kind='status' and typ='document') then raise exception 'wa_unsupported_message'; end if;
    if typ='text' and length(trim(coalesce(c.content_text,'')))=0 then raise exception 'wa_text_required'; end if;
    if p_mode='test' then
      if not exists(select 1 from public.wa_marketing_live_test_targets where target_id=t.id and enabled) then raise exception 'wa_test_target_not_approved'; end if;
      if (t.kind<>'group' or typ<>'text') and not public.wa_live_verified('group','text',p_fingerprint) then raise exception 'wa_group_text_test_required'; end if;
      if typ<>'text' and not public.wa_live_verified(t.kind,'text',p_fingerprint) then raise exception 'wa_text_test_required'; end if;
    elsif not public.wa_live_verified(t.kind,typ,p_fingerprint) then raise exception 'wa_destination_not_verified';
    end if;
    snap:=jsonb_build_object('kind',t.kind,'external_id',case when t.kind='status' then 'status' else t.external_id end,'content_text',c.content_text,
      'cta_url',c.cta_url,'message_type',c.message_type,'media_path',c.media_path,'media_duration_seconds',c.wa_media_duration_seconds);
    select * into previous from public.wa_marketing_live_jobs where campaign_id=c.id and snapshot_hash=md5(snap::text);
    if found then raise exception 'wa_content_already_queued'; end if;
    select delay_seconds into override_gap from public.wa_marketing_campaign_targets where campaign_id=c.id and target_id=t.id;
    gap:=coalesce(override_gap,lo+floor(random()*(hi-lo+1))::integer);
    if gap<30 or gap>3600 then raise exception 'wa_invalid_delay'; end if;
    if ordinal>0 then
      due:=due+make_interval(secs=>gap);
      -- Destination overrides describe its gap after the previous recipient.
      update public.wa_marketing_live_jobs set gap_seconds=gap where id=row_id;
    end if;
    insert into public.wa_marketing_live_jobs(run_id,campaign_id,target_id,target_name,target_kind,message_type,snapshot,snapshot_hash,session_fingerprint,position,send_after,gap_seconds)
      values(run_id,c.id,t.id,t.name,t.kind,typ,snap,md5(snap::text),p_fingerprint,ordinal,due,lo+floor(random()*(hi-lo+1))::integer) returning id into row_id;
    insert into public.wa_marketing_live_events(job_id,run_id,actor_id,event) values(row_id,run_id,p_actor,'queued');
    ordinal:=ordinal+1;
  end loop;
  return jsonb_build_object('run_id',run_id,'queued',ordinal,'duplicate',false);
end $$;

create function public.wa_live_claim(p_job_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare cfg public.wa_marketing_live_settings; j public.wa_marketing_live_jobs; r public.wa_marketing_live_runs;
begin
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  -- Reclaim only preparation work. An expired dispatch is ambiguous, NEVER requeued.
  if cfg.active_job_id is not null then
    select * into j from public.wa_marketing_live_jobs where id=cfg.active_job_id for update;
    if j.lease_until>clock_timestamp() then return null; end if;
    update public.wa_marketing_live_jobs set status=case when status='preparing' then 'queued' else 'unknown' end,
      error_code=case when status='dispatching' then 'dispatch_lease_expired' else null end,
      claim_token=null,lease_until=null,updated_at=now() where id=j.id and status in ('preparing','dispatching');
    insert into public.wa_marketing_live_events(job_id,run_id,event) values(j.id,j.run_id,'lease_expired');
    if j.status='dispatching' then
      update public.wa_marketing_live_runs set status='paused' where id=j.run_id and status='active';
    end if;
    update public.wa_marketing_live_settings set active_job_id=null,
      next_send_at=greatest(next_send_at,clock_timestamp()+make_interval(secs=>greatest(cfg.min_gap_seconds,coalesce(j.gap_seconds,30)))) where singleton;
    return null;
  end if;
  if cfg.next_send_at>clock_timestamp() then return null; end if;
  select jobs.* into j from public.wa_marketing_live_jobs jobs join public.wa_marketing_live_runs runs on runs.id=jobs.run_id
    where jobs.status='queued' and jobs.send_after<=clock_timestamp() and runs.status='active'
      and (p_job_id is null or jobs.id=p_job_id)
      and ((runs.mode='test' and cfg.testing_enabled) or (runs.mode='single' and cfg.enabled) or (runs.mode='scheduled' and cfg.enabled and cfg.scheduler_enabled))
    order by jobs.send_after,jobs.position limit 1 for update of jobs skip locked;
  if not found then return null; end if;
  select * into r from public.wa_marketing_live_runs where id=j.run_id for update;
  if r.status<>'active' then return null; end if;
  update public.wa_marketing_live_jobs set status='preparing',claim_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '2 minutes',updated_at=now()
    where id=j.id returning * into j;
  update public.wa_marketing_live_settings set active_job_id=j.id where singleton;
  insert into public.wa_marketing_live_events(job_id,run_id,event) values(j.id,j.run_id,'preparing');
  return to_jsonb(j);
end $$;

create function public.wa_live_dispatch(p_job_id uuid,p_claim_token uuid,p_fingerprint text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare cfg public.wa_marketing_live_settings; j public.wa_marketing_live_jobs; r public.wa_marketing_live_runs;
begin
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  select * into j from public.wa_marketing_live_jobs where id=p_job_id for update;
  if not found or j.status<>'preparing' or j.claim_token is distinct from p_claim_token or j.lease_until<=clock_timestamp() or cfg.active_job_id is distinct from j.id then return false; end if;
  select * into r from public.wa_marketing_live_runs where id=j.run_id for update;
  if r.status<>'active' or j.session_fingerprint<>p_fingerprint
    or not exists(select 1 from public.admin_team_members where auth_user_id=r.created_by and status='active' and role in ('owner','super_admin'))
    or (r.mode='test' and not cfg.testing_enabled) or (r.mode<>'test' and not cfg.enabled)
    or (r.mode='scheduled' and not cfg.scheduler_enabled)
    or not exists(select 1 from public.wa_marketing_targets where id=j.target_id and enabled and kind=j.target_kind and (kind='status' or external_id=j.snapshot->>'external_id'))
    or not exists(select 1 from public.wa_marketing_campaigns where id=j.campaign_id and status<>'paused')
    or not exists(select 1 from public.wa_marketing_campaign_targets where campaign_id=j.campaign_id and target_id=j.target_id)
    or j.snapshot_hash<>(select md5(jsonb_build_object('kind',j.target_kind,'external_id',j.snapshot->>'external_id',
      'content_text',c.content_text,'cta_url',c.cta_url,'message_type',c.message_type,'media_path',c.media_path,
      'media_duration_seconds',c.wa_media_duration_seconds)::text) from public.wa_marketing_campaigns c where c.id=j.campaign_id)
    or (r.mode='test' and not exists(select 1 from public.wa_marketing_live_test_targets where target_id=j.target_id and enabled))
    or (r.mode<>'test' and not public.wa_live_verified(j.target_kind,j.message_type,p_fingerprint))
    or (r.mode='test' and (j.target_kind<>'group' or j.message_type<>'text') and not public.wa_live_verified('group','text',p_fingerprint))
    or (r.mode='test' and j.message_type<>'text' and not public.wa_live_verified(j.target_kind,'text',p_fingerprint)) then return false; end if;
  update public.wa_marketing_live_jobs set status='dispatching',attempts=1,dispatch_started_at=clock_timestamp(),
    lease_until=clock_timestamp()+interval '6 minutes',updated_at=now() where id=j.id;
  insert into public.wa_marketing_live_events(job_id,run_id,event) values(j.id,j.run_id,'dispatching');
  return true;
end $$;

create function public.wa_live_settle(p_job_id uuid,p_claim_token uuid,p_status text,p_provider_id text default null,p_http_status integer default null,p_error_code text default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare cfg public.wa_marketing_live_settings; j public.wa_marketing_live_jobs;
begin
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  select * into j from public.wa_marketing_live_jobs where id=p_job_id for update;
  if not found or j.claim_token is distinct from p_claim_token or j.status not in ('preparing','dispatching') then raise exception 'wa_invalid_claim'; end if;
  if p_status not in ('api_accepted','failed','unknown','cancelled') or p_status is null then raise exception 'wa_invalid_outcome'; end if;
  if (p_status='api_accepted' and (j.status<>'dispatching' or p_provider_id is null or p_provider_id !~ '^[A-Za-z0-9_-]{1,200}$'))
    or (j.status='dispatching' and p_status='cancelled') then raise exception 'wa_invalid_outcome'; end if;
  update public.wa_marketing_live_jobs set status=p_status,provider_message_id=p_provider_id,provider_http_status=p_http_status,
    error_code=p_error_code,accepted_at=case when p_status='api_accepted' then clock_timestamp() else null end,
    lease_until=null,claim_token=null,updated_at=now() where id=j.id;
  update public.wa_marketing_live_settings set active_job_id=null,
    next_send_at=greatest(next_send_at,clock_timestamp()+make_interval(secs=>greatest(min_gap_seconds,j.gap_seconds))),updated_at=now()
    where singleton and active_job_id=j.id;
  insert into public.wa_marketing_live_events(job_id,run_id,event) values(j.id,j.run_id,p_status);
  if p_status in ('unknown','failed') then
    update public.wa_marketing_live_runs set status='paused' where id=j.run_id and status='active';
    insert into public.wa_marketing_live_events(run_id,event) values(j.run_id,'paused_after_error');
  elsif not exists(select 1 from public.wa_marketing_live_jobs where run_id=j.run_id and status in ('queued','preparing','dispatching')) then
    update public.wa_marketing_live_runs set status='finished' where id=j.run_id and status='active';
  end if;
end $$;

create function public.wa_live_control(p_actor uuid,p_run_id uuid,p_action text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.wa_marketing_live_runs;
begin
  perform public.wa_live_assert_owner(p_actor);
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into r from public.wa_marketing_live_runs where id=p_run_id for update;
  if not found or r.status in ('finished','cancelled') then raise exception 'wa_run_unavailable'; end if;
  if p_action not in ('pause','resume','cancel') or p_action is null then raise exception 'wa_invalid_action'; end if;
  if p_action='resume' and exists(select 1 from public.wa_marketing_live_jobs where run_id=r.id and status='unknown') then raise exception 'wa_uncertain_delivery_requires_review'; end if;
  update public.wa_marketing_live_runs set status=case p_action when 'pause' then 'paused' when 'resume' then 'active' else 'cancelled' end where id=r.id;
  if p_action='cancel' then
    update public.wa_marketing_live_jobs set status='cancelled',updated_at=now() where run_id=r.id and status='queued';
  end if;
  insert into public.wa_marketing_live_events(run_id,actor_id,event) values(r.id,p_actor,p_action);
  -- A POST already marked dispatching may complete after pause; its outcome is retained.
end $$;

create function public.wa_live_confirm(p_actor uuid,p_job_id uuid,p_evidence text,p_observed_at timestamptz) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.wa_marketing_live_jobs; r public.wa_marketing_live_runs;
begin
  perform public.wa_live_assert_owner(p_actor);
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into j from public.wa_marketing_live_jobs where id=p_job_id for update;
  if not found or j.status not in ('api_accepted','unknown') or j.attempts<>1 then raise exception 'wa_no_delivery_to_confirm'; end if;
  if p_evidence is null or length(trim(p_evidence))<15 or length(p_evidence)>2000 then raise exception 'wa_delivery_evidence_required'; end if;
  if p_observed_at is null or p_observed_at<j.dispatch_started_at or p_observed_at>clock_timestamp()+interval '1 minute' then raise exception 'wa_invalid_observation_time'; end if;
  update public.wa_marketing_live_jobs set status='delivered',delivered_at=p_observed_at,confirmed_by=p_actor,evidence=trim(p_evidence),updated_at=now() where id=j.id;
  select * into r from public.wa_marketing_live_runs where id=j.run_id;
  if r.mode='test' then
    insert into public.wa_marketing_live_verifications(target_kind,message_type,session_fingerprint,job_id,verified_by)
      values(j.target_kind,j.message_type,j.session_fingerprint,j.id,p_actor)
      on conflict(target_kind,message_type,session_fingerprint) do update set job_id=excluded.job_id,verified_by=excluded.verified_by,verified_at=now();
  end if;
  insert into public.wa_marketing_live_events(job_id,run_id,actor_id,event) values(j.id,j.run_id,p_actor,'recipient_confirmed');
end $$;

-- Any draft/target edit cancels pending snapshots. Never starts or revives a run.
create function public.wa_live_invalidate() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare campaign uuid; target uuid;
begin
  if TG_TABLE_NAME='wa_marketing_campaigns' then
    campaign:=OLD.id;
    if TG_OP='UPDATE' and NEW is not distinct from OLD then return NEW; end if;
  elsif TG_TABLE_NAME='wa_marketing_campaign_targets' then
    campaign:=case when TG_OP='DELETE' then OLD.campaign_id else NEW.campaign_id end;
  else
    target:=OLD.id;
    if TG_OP='UPDATE' and NEW is not distinct from OLD then return NEW; end if;
  end if;
  -- Lock order matches the dispatch guard. In-flight provider POSTs cannot be undone.
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  update public.wa_marketing_live_runs set status='paused' where status='active' and
    (campaign_id=campaign or id in(select run_id from public.wa_marketing_live_jobs where target_id=target));
  with cancelled as (
    update public.wa_marketing_live_jobs set status='cancelled',error_code='draft_or_target_changed',updated_at=now()
    where status='queued' and (campaign_id=campaign or target_id=target) returning id,run_id
  ) insert into public.wa_marketing_live_events(job_id,run_id,event) select id,run_id,'snapshot_invalidated' from cancelled;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end $$;
create trigger wa_live_campaign_changed after update or delete on public.wa_marketing_campaigns for each row execute function public.wa_live_invalidate();
create trigger wa_live_selections_changed after insert or update or delete on public.wa_marketing_campaign_targets for each row execute function public.wa_live_invalidate();
create trigger wa_live_target_changed after update or delete on public.wa_marketing_targets for each row execute function public.wa_live_invalidate();

-- PostgreSQL grants PUBLIC execution by default: explicitly remove it for every
-- new RPC and trigger; browser callers cannot spoof p_actor or bypass dispatch.
do $$ declare f record; begin
  for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'wa_live_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;

commit;
