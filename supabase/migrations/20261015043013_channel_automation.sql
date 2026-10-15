-- Channel automation is isolated from existing campaigns and live delivery jobs.
-- Dependencies: existing wa_live_owner(), wa_live_issue_worker_token(), Zawa
-- connection, live settings and verification tables. No live flags are enabled.
create schema if not exists badai_channel;
revoke all on schema badai_channel from public, anon;
grant usage on schema badai_channel to authenticated, service_role;

create table public.wa_channel_settings (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null unique references public.wa_marketing_targets(id),
  enabled boolean not null default false,
  duration_days integer not null default 30 check(duration_days between 1 and 10000),
  start_date date not null,
  timezone text not null default 'Asia/Jakarta' check(timezone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura','UTC')),
  send_times time[] not null default array['08:00'::time],
  loop boolean not null default false,
  version integer not null default 1,
  activated_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(cardinality(send_times) between 1 and 24)
);
create table public.wa_channel_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(trim(title)) between 1 and 140),
  caption text not null default '' check(length(caption)<=12000),
  image_path text check(image_path ~ '^campaigns/[0-9a-f-]{36}/[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(length(trim(caption))>0 or image_path is not null)
);
create table public.wa_channel_calendar_slots (
  settings_id uuid not null references public.wa_channel_settings(id) on delete cascade,
  day_number integer not null check(day_number between 1 and 10000),
  send_time time not null,
  content_id uuid not null references public.wa_channel_contents(id),
  primary key(settings_id,day_number,send_time)
);
create index wa_channel_slot_content on public.wa_channel_calendar_slots(content_id);
create table public.wa_channel_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  settings_id uuid not null references public.wa_channel_settings(id),
  content_id uuid not null, -- Deliberately retained after a master draft is deleted.
  target_id uuid not null,
  day_number integer not null,
  send_time time not null,
  local_date date not null,
  cycle_number integer not null check(cycle_number>=1),
  settings_version integer not null,
  requested_by uuid not null,
  request_key uuid,
  snapshot jsonb not null,
  session_fingerprint text not null,
  status text not null default 'queued' check(status in ('queued','preparing','dispatching','api_accepted','delivered','failed','unknown','cancelled')),
  claim_token uuid,
  lease_until timestamptz,
  provider_response jsonb,
  delivered_at timestamptz,
  delivery_evidence text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index wa_channel_scheduled_once on public.wa_channel_delivery_logs(settings_id,local_date,send_time) where request_key is null;
create unique index wa_channel_manual_once on public.wa_channel_delivery_logs(requested_by,request_key) where request_key is not null;
create index wa_channel_log_due on public.wa_channel_delivery_logs(created_at) where status='queued';
create index wa_channel_log_settings on public.wa_channel_delivery_logs(settings_id,created_at desc);

alter table public.wa_channel_settings enable row level security;
alter table public.wa_channel_contents enable row level security;
alter table public.wa_channel_calendar_slots enable row level security;
alter table public.wa_channel_delivery_logs enable row level security;
revoke all on public.wa_channel_settings,public.wa_channel_contents,public.wa_channel_calendar_slots,public.wa_channel_delivery_logs from anon,authenticated;
grant select on public.wa_channel_settings,public.wa_channel_contents,public.wa_channel_calendar_slots,public.wa_channel_delivery_logs to authenticated;
grant insert,update on public.wa_channel_contents to authenticated;
grant all on public.wa_channel_settings,public.wa_channel_contents,public.wa_channel_calendar_slots,public.wa_channel_delivery_logs to service_role;
create policy channel_settings_read on public.wa_channel_settings for select to authenticated using((select public.wa_live_owner()));
create policy channel_contents_read on public.wa_channel_contents for select to authenticated using((select public.wa_live_owner()));
create policy channel_contents_insert on public.wa_channel_contents for insert to authenticated with check((select public.wa_live_owner()));
create policy channel_contents_update on public.wa_channel_contents for update to authenticated using((select public.wa_live_owner())) with check((select public.wa_live_owner()));
create policy channel_slots_read on public.wa_channel_calendar_slots for select to authenticated using((select public.wa_live_owner()));
create policy channel_logs_read on public.wa_channel_delivery_logs for select to authenticated using((select public.wa_live_owner()));

-- Internal fingerprint matches the existing Zawa adapter's JSON.stringify array.
create function badai_channel.fingerprint() returns text language sql stable security definer set search_path='' as $$
  select encode(extensions.digest(convert_to('['||to_json(c.provider_id)::text||','||to_json(c.session_secret)::text||
    case when c.session_epoch is null then '' else ','||to_json(c.session_epoch::text)::text end||']','UTF8'),'sha256'),'hex')
  from public.wa_marketing_connection_secure c where c.id=1;
$$;
create function badai_channel.assert_ready(p_image boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare fp text:=badai_channel.fingerprint();
begin
  if not exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled) then raise exception 'wa_sending_disabled'; end if;
  if fp is null or not public.wa_live_verified('channel',case when p_image then 'image' else 'text' end,fp) then raise exception 'wa_destination_not_verified'; end if;
end $$;

create function badai_channel.save_schedule(p_settings jsonb,p_slots jsonb,p_expected_version integer,p_confirm_enable boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old public.wa_channel_settings; s public.wa_channel_settings;
  sid uuid:=(p_settings->>'id')::uuid; target uuid:=(p_settings->>'target_id')::uuid;
  times time[]; days integer:=(p_settings->>'duration_days')::integer; turn_on boolean:=coalesce((p_settings->>'enabled')::boolean,false);
begin
  perform public.wa_live_assert_owner(actor);
  -- Same lock order as worker. Saving OFF cancels all not-yet-dispatched work.
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into old from public.wa_channel_settings where id=sid for update;
  if (old.id is null and p_expected_version<>0) or (old.id is not null and old.version<>p_expected_version) then raise exception 'wa_schedule_changed_reload'; end if;
  if old.id is not null and old.target_id<>target then raise exception 'wa_target_immutable'; end if;
  if not exists(select 1 from public.wa_marketing_targets where id=target and kind='channel' and enabled) then raise exception 'wa_target_disabled'; end if;
  if jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>240000 then raise exception 'wa_invalid_slots'; end if;
  if jsonb_typeof(p_settings->'send_times')<>'array' then raise exception 'wa_invalid_times'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_settings->'send_times') t where t!~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then raise exception 'wa_invalid_times'; end if;
  select array_agg(t::time order by t::time) into times from jsonb_array_elements_text(p_settings->'send_times') t;
  if days is null or days not between 1 and 10000 or cardinality(times) is null or cardinality(times) not between 1 and 24
    or cardinality(times)<>(select count(distinct x) from unnest(times) x) then raise exception 'wa_invalid_schedule'; end if;
  if turn_on then
    if not coalesce(old.enabled,false) and not coalesce(p_confirm_enable,false) then raise exception 'wa_confirmation_required'; end if;
    perform badai_channel.assert_ready(false);
    if exists(select 1 from jsonb_to_recordset(p_slots) as x(content_id uuid) join public.wa_channel_contents c on c.id=x.content_id where c.image_path is not null) then perform badai_channel.assert_ready(true); end if;
  end if;
  insert into public.wa_channel_settings(id,target_id,enabled,duration_days,start_date,timezone,send_times,loop,version,activated_at,created_by)
  values(sid,target,turn_on,days,(p_settings->>'start_date')::date,p_settings->>'timezone',times,(p_settings->>'loop')::boolean,1,
    case when turn_on then clock_timestamp() end,actor)
  on conflict(id) do update set enabled=excluded.enabled,duration_days=excluded.duration_days,start_date=excluded.start_date,timezone=excluded.timezone,
    send_times=excluded.send_times,loop=excluded.loop,version=wa_channel_settings.version+1,created_by=actor,
    activated_at=case when excluded.enabled then clock_timestamp() else null end,updated_at=clock_timestamp()
  returning * into s;
  if exists(select 1 from jsonb_to_recordset(p_slots) as x(day_number integer,send_time time,content_id uuid)
    where day_number is null or day_number<1 or day_number>days or send_time is null or not(send_time=any(times)) or content_id is null) then raise exception 'wa_invalid_slots'; end if;
  delete from public.wa_channel_calendar_slots where settings_id=sid;
  insert into public.wa_channel_calendar_slots(settings_id,day_number,send_time,content_id)
    select sid,x.day_number,x.send_time,x.content_id from jsonb_to_recordset(p_slots) as x(day_number integer,send_time time,content_id uuid);
  update public.wa_channel_delivery_logs set status='cancelled',error_code='schedule_updated',updated_at=clock_timestamp(),claim_token=null,lease_until=null
    where settings_id=sid and status in ('queued','preparing');
  return to_jsonb(s);
end $$;
create function public.wa_channel_save_schedule(p_settings jsonb,p_slots jsonb,p_expected_version integer,p_confirm_enable boolean default false)
returns jsonb language sql security invoker set search_path='' as $$ select badai_channel.save_schedule(p_settings,p_slots,p_expected_version,p_confirm_enable); $$;

create function badai_channel.delete_content(p_content_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform public.wa_live_assert_owner(auth.uid());
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  update public.wa_channel_settings set version=version+1,updated_at=clock_timestamp() where id in
    (select settings_id from public.wa_channel_calendar_slots where content_id=p_content_id);
  delete from public.wa_channel_calendar_slots where content_id=p_content_id;
  update public.wa_channel_delivery_logs set status='cancelled',error_code='content_deleted',updated_at=clock_timestamp(),claim_token=null,lease_until=null
    where content_id=p_content_id and status in ('queued','preparing');
  delete from public.wa_channel_contents where id=p_content_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version)),'[]'::jsonb) into result from public.wa_channel_settings;
  return result;
end $$;
create function public.wa_channel_delete_content(p_content_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select badai_channel.delete_content(p_content_id); $$;

create function badai_channel.confirm_received(p_id uuid,p_evidence text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.wa_live_assert_owner(auth.uid());
  if length(trim(coalesce(p_evidence,''))) not between 10 and 1000 then raise exception 'wa_delivery_evidence_required'; end if;
  update public.wa_channel_delivery_logs set status='delivered',delivered_at=clock_timestamp(),delivery_evidence=trim(p_evidence),updated_at=clock_timestamp()
    where id=p_id and status in ('api_accepted','unknown');
  if not found then raise exception 'wa_invalid_delivery_confirmation'; end if;
end $$;
create function public.wa_channel_confirm_received(p_id uuid,p_evidence text) returns void language sql security invoker set search_path='' as $$ select badai_channel.confirm_received(p_id,p_evidence); $$;

-- The occurrence identity is date + wall-clock time, independent of edits to
-- the template. A loop creates new dates/cycles and never overwrites old logs.
create function badai_channel.enqueue(p_settings_id uuid,p_day integer,p_time time,p_date date,p_request uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.wa_channel_settings; c public.wa_channel_contents; t public.wa_marketing_targets; result uuid; elapsed integer;
begin
  select * into s from public.wa_channel_settings where id=p_settings_id;
  perform public.wa_live_assert_owner(s.created_by);
  select c2.* into c from public.wa_channel_calendar_slots sl join public.wa_channel_contents c2 on c2.id=sl.content_id
    where sl.settings_id=s.id and sl.day_number=p_day and sl.send_time=p_time;
  if c.id is null then raise exception 'wa_slot_empty'; end if;
  select * into t from public.wa_marketing_targets where id=s.target_id and enabled and kind='channel';
  if t.id is null then raise exception 'wa_target_disabled'; end if;
  perform badai_channel.assert_ready(c.image_path is not null);
  elapsed:=greatest(0,p_date-s.start_date);
  insert into public.wa_channel_delivery_logs(settings_id,content_id,target_id,day_number,send_time,local_date,cycle_number,settings_version,requested_by,request_key,snapshot,session_fingerprint)
  values(s.id,c.id,t.id,p_day,p_time,p_date,elapsed/s.duration_days+1,s.version,s.created_by,p_request,
    jsonb_build_object('kind','channel','external_id',t.external_id,'target_name',t.name,'title',c.title,'content_text',c.caption,
      'message_type',case when c.image_path is null then 'text' else 'media' end,'media_path',c.image_path),badai_channel.fingerprint())
  on conflict do nothing returning id into result;
  return result;
end $$;
create function badai_channel.send_now(p_settings_id uuid,p_day_number integer,p_send_time time,p_request_key uuid,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.wa_channel_settings; result uuid; prior public.wa_channel_delivery_logs;
begin
  perform public.wa_live_assert_owner(auth.uid());
  if not coalesce(p_confirm,false) or p_request_key is null then raise exception 'wa_confirmation_required'; end if;
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into prior from public.wa_channel_delivery_logs where requested_by=auth.uid() and request_key=p_request_key;
  if found then
    if prior.settings_id<>p_settings_id or prior.day_number<>p_day_number or prior.send_time<>p_send_time then raise exception 'wa_request_key_conflict'; end if;
    return jsonb_build_object('id',prior.id,'duplicate',true);
  end if;
  select * into s from public.wa_channel_settings where id=p_settings_id for update;
  if s.id is null then raise exception 'wa_schedule_unavailable'; end if;
  -- The requesting administrator must own the immutable delivery snapshot.
  update public.wa_channel_settings set created_by=auth.uid() where id=s.id;
  result:=badai_channel.enqueue(s.id,p_day_number,p_send_time,(clock_timestamp() at time zone s.timezone)::date,p_request_key);
  return jsonb_build_object('id',result,'duplicate',false);
end $$;
create function public.wa_channel_send_now(p_settings_id uuid,p_day_number integer,p_send_time time,p_request_key uuid,p_confirm boolean default false)
returns jsonb language sql security invoker set search_path='' as $$ select badai_channel.send_now(p_settings_id,p_day_number,p_send_time,p_request_key,p_confirm); $$;

create function public.wa_channel_tick() returns integer language plpgsql security definer set search_path='' as $$
declare s public.wa_channel_settings; sl public.wa_channel_calendar_slots; today date; elapsed integer; due timestamptz; count_jobs integer:=0; job uuid;
begin
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  if not exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled) then return 0; end if;
  for s in select * from public.wa_channel_settings where enabled order by id for update loop
    today:=(clock_timestamp() at time zone s.timezone)::date; elapsed:=today-s.start_date;
    if elapsed<0 then continue; end if;
    if not s.loop and elapsed>=s.duration_days then
      update public.wa_channel_settings set enabled=false,version=version+1,updated_at=clock_timestamp() where id=s.id;
      continue;
    end if;
    for sl in select * from public.wa_channel_calendar_slots where settings_id=s.id and day_number=elapsed%s.duration_days+1 loop
      due:=(today+sl.send_time) at time zone s.timezone;
      -- Never flood old slots after downtime or on first activation.
      if due>clock_timestamp() or due<greatest(s.activated_at,clock_timestamp()-interval '5 minutes') then continue; end if;
      begin
        job:=badai_channel.enqueue(s.id,sl.day_number,sl.send_time,today);
        if job is not null then count_jobs:=count_jobs+1; end if;
      exception when others then
        -- Gate/verification failures leave the schedule intact; no provider call.
        continue;
      end;
    end loop;
  end loop;
  return count_jobs;
end $$;

create function public.wa_channel_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.wa_marketing_live_settings; j public.wa_channel_delivery_logs;
begin
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  update public.wa_channel_delivery_logs set status=case when status='dispatching' then 'unknown' else 'failed' end,
    error_code=case when status='dispatching' then 'provider_outcome_uncertain' else 'preparation_expired' end,
    claim_token=null,lease_until=null,updated_at=clock_timestamp()
    where status in ('preparing','dispatching') and lease_until<=clock_timestamp();
  if not cfg.enabled or not cfg.scheduler_enabled or cfg.active_job_id is not null or cfg.next_send_at>clock_timestamp()
    or exists(select 1 from public.wa_channel_delivery_logs where status in ('preparing','dispatching')) then return null; end if;
  select * into j from public.wa_channel_delivery_logs where status='queued' order by created_at,id limit 1 for update skip locked;
  if j.id is null then return null; end if;
  -- Drop delayed automatic slots instead of sending a backlog hours later.
  if j.request_key is null and j.created_at<clock_timestamp()-interval '5 minutes' then
    update public.wa_channel_delivery_logs set status='cancelled',error_code='slot_expired',updated_at=clock_timestamp() where id=j.id;
    return null;
  end if;
  update public.wa_channel_delivery_logs set status='preparing',claim_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '3 minutes',updated_at=clock_timestamp()
    where id=j.id returning * into j;
  -- Share the existing dispatch throttle. The worker performs no retries.
  update public.wa_marketing_live_settings set next_send_at=clock_timestamp()+interval '3 minutes' where singleton;
  return to_jsonb(j);
end $$;

create function public.wa_channel_dispatch(p_id uuid,p_claim uuid,p_fingerprint text) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.wa_channel_delivery_logs; s public.wa_channel_settings;
begin
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into j from public.wa_channel_delivery_logs where id=p_id for update;
  if j.id is null or j.status<>'preparing' or j.claim_token is distinct from p_claim or j.lease_until<=clock_timestamp() then return false; end if;
  select * into s from public.wa_channel_settings where id=j.settings_id for update;
  if s.version<>j.settings_version or (j.request_key is null and not s.enabled)
    or not exists(select 1 from public.admin_team_members where auth_user_id=j.requested_by and status='active' and role in ('owner','super_admin'))
    or not exists(select 1 from public.wa_marketing_targets where id=j.target_id and enabled and kind='channel' and external_id=j.snapshot->>'external_id')
    or not exists(select 1 from public.wa_channel_calendar_slots where settings_id=s.id and day_number=j.day_number and send_time=j.send_time and content_id=j.content_id)
    or p_fingerprint is distinct from j.session_fingerprint or p_fingerprint is distinct from badai_channel.fingerprint() then return false; end if;
  perform badai_channel.assert_ready(j.snapshot->>'message_type'='media');
  update public.wa_channel_delivery_logs set status='dispatching',lease_until=clock_timestamp()+interval '3 minutes',updated_at=clock_timestamp() where id=j.id;
  return true;
end $$;

create function public.wa_channel_settle(p_id uuid,p_claim uuid,p_status text,p_response jsonb,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
declare j public.wa_channel_delivery_logs;
begin
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into j from public.wa_channel_delivery_logs where id=p_id for update;
  if j.id is null or j.claim_token is distinct from p_claim or j.status not in ('preparing','dispatching') then return; end if;
  if p_status not in ('api_accepted','failed','unknown','cancelled') or p_status is null
    or (p_status='api_accepted' and j.status<>'dispatching') or (p_status='cancelled' and j.status='dispatching') then raise exception 'wa_invalid_outcome'; end if;
  update public.wa_channel_delivery_logs set status=p_status,provider_response=p_response,error_code=p_error,claim_token=null,lease_until=null,updated_at=clock_timestamp() where id=j.id;
  update public.wa_marketing_live_settings set next_send_at=clock_timestamp()+make_interval(secs=>greatest(min_gap_seconds,30)) where singleton;
end $$;

-- Private definer entrypoints check the authenticated actor. Public wrappers
-- run as invoker; worker RPCs are service-role only, never browser-callable.
revoke all on all functions in schema badai_channel from public,anon,authenticated;
grant execute on function badai_channel.save_schedule(jsonb,jsonb,integer,boolean),badai_channel.delete_content(uuid),badai_channel.send_now(uuid,integer,time,uuid,boolean) to authenticated;
grant execute on function badai_channel.confirm_received(uuid,text) to authenticated;
revoke all on function public.wa_channel_save_schedule(jsonb,jsonb,integer,boolean),public.wa_channel_delete_content(uuid),public.wa_channel_send_now(uuid,integer,time,uuid,boolean) from public,anon;
grant execute on function public.wa_channel_save_schedule(jsonb,jsonb,integer,boolean),public.wa_channel_delete_content(uuid),public.wa_channel_send_now(uuid,integer,time,uuid,boolean) to authenticated;
revoke all on function public.wa_channel_confirm_received(uuid,text) from public,anon;
grant execute on function public.wa_channel_confirm_received(uuid,text) to authenticated;
revoke all on function public.wa_channel_tick(),public.wa_channel_claim(),public.wa_channel_dispatch(uuid,uuid,text),public.wa_channel_settle(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.wa_channel_tick(),public.wa_channel_claim(),public.wa_channel_dispatch(uuid,uuid,text),public.wa_channel_settle(uuid,uuid,text,jsonb,text) to service_role;

-- Scheduler runs independently of browser sessions, using the existing signed,
-- one-use worker proof. Empty/default-OFF settings cannot publish anything.
select cron.schedule('badai-wa-channel-worker','15 seconds',$cron$
  select net.http_post(
    url:='https://tlvxlekqrllkvcpgwmic.supabase.co/functions/v1/badai-wa-channel',
    headers:=public.wa_live_issue_worker_token(),body:='{"action":"worker"}'::jsonb,timeout_milliseconds:=120000
  );
$cron$);
