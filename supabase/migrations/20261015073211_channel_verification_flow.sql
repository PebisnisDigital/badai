-- A controlled Channel-only test can verify a newly paired WhatsApp session.
-- Production publication still requires receipt evidence and an explicit enable.
alter table public.wa_channel_delivery_logs add column is_test boolean not null default false;
create index wa_channel_verified_receipts on public.wa_channel_delivery_logs(target_id,session_fingerprint)
  where is_test and status='delivered';
create function badai_channel.verified(p_target uuid,p_image boolean default false) returns boolean language sql stable security definer set search_path='' as $$
  select public.wa_live_verified('channel',case when p_image then 'image' else 'text' end,badai_channel.fingerprint()) or exists(
    select 1 from public.wa_channel_delivery_logs where target_id=p_target and is_test and status='delivered'
      and delivery_evidence is not null and session_fingerprint=badai_channel.fingerprint()
      and snapshot->>'message_type'=case when p_image then 'media' else 'text' end);
$$;
create function badai_channel.assert_ready_for(p_target uuid,p_image boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled) then raise exception 'wa_sending_disabled'; end if;
  if not badai_channel.verified(p_target,p_image) then raise exception 'wa_destination_not_verified'; end if;
end $$;
create function badai_channel.activate(p_target uuid,p_confirm boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if not (badai_channel.verified(p_target,false) or badai_channel.verified(p_target,true)) then raise exception 'wa_destination_not_verified'; end if;
  if exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled) then return; end if;
  if not coalesce(p_confirm,false) then raise exception 'wa_confirmation_required'; end if;
  -- Do not unexpectedly release any earlier campaign backlog.
  if exists(select 1 from public.wa_marketing_live_jobs where status in ('queued','preparing','dispatching')) then raise exception 'wa_pending_campaigns_require_attention'; end if;
  update public.wa_marketing_live_settings set enabled=true,scheduler_enabled=true,updated_at=clock_timestamp() where singleton;
end $$;
create function badai_channel.capabilities(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.wa_live_assert_owner(auth.uid());
  return jsonb_build_object('text_verified',badai_channel.verified(p_target,false),'image_verified',badai_channel.verified(p_target,true),
    'publication_enabled',exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled));
end $$;
create function public.wa_channel_capabilities(p_target uuid) returns jsonb language sql security invoker set search_path='' as $$ select badai_channel.capabilities(p_target); $$;
create function badai_channel.send_test(p_settings_id uuid,p_day_number integer,p_send_time time,p_request_key uuid,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.wa_channel_settings; c public.wa_channel_contents; t public.wa_marketing_targets; prior public.wa_channel_delivery_logs; jid uuid;
begin
  perform public.wa_live_assert_owner(auth.uid());
  if not coalesce(p_confirm,false) or p_request_key is null then raise exception 'wa_confirmation_required'; end if;
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  select * into prior from public.wa_channel_delivery_logs where requested_by=auth.uid() and request_key=p_request_key;
  if found then
    if not prior.is_test or prior.settings_id<>p_settings_id or prior.day_number<>p_day_number or prior.send_time<>p_send_time then raise exception 'wa_request_key_conflict'; end if;
    return jsonb_build_object('id',prior.id,'duplicate',true);
  end if;
  select * into s from public.wa_channel_settings where id=p_settings_id for update;
  select c2.* into c from public.wa_channel_calendar_slots sl join public.wa_channel_contents c2 on c2.id=sl.content_id
    where sl.settings_id=s.id and sl.day_number=p_day_number and sl.send_time=p_send_time;
  if s.id is null or c.id is null then raise exception 'wa_slot_empty'; end if;
  select * into t from public.wa_marketing_targets where id=s.target_id and kind='channel' and enabled;
  if t.id is null then raise exception 'wa_target_disabled'; end if;
  if badai_channel.fingerprint() is null then raise exception 'connection_not_configured'; end if;
  insert into public.wa_channel_delivery_logs(settings_id,content_id,target_id,day_number,send_time,local_date,cycle_number,settings_version,requested_by,request_key,snapshot,session_fingerprint,is_test)
  values(s.id,c.id,t.id,p_day_number,p_send_time,(clock_timestamp() at time zone s.timezone)::date,
    greatest(0,((clock_timestamp() at time zone s.timezone)::date-s.start_date))/s.duration_days+1,s.version,auth.uid(),p_request_key,
    jsonb_build_object('kind','channel','external_id',t.external_id,'target_name',t.name,'title',c.title,'content_text',c.caption,
      'message_type',case when c.image_path is null then 'text' else 'media' end,'media_path',c.image_path),badai_channel.fingerprint(),true) returning id into jid;
  return jsonb_build_object('id',jid,'duplicate',false);
end $$;
create function public.wa_channel_send_test(p_settings_id uuid,p_day_number integer,p_send_time time,p_request_key uuid,p_confirm boolean default false)
returns jsonb language sql security invoker set search_path='' as $$ select badai_channel.send_test(p_settings_id,p_day_number,p_send_time,p_request_key,p_confirm); $$;
revoke all on function badai_channel.verified(uuid,boolean),badai_channel.assert_ready_for(uuid,boolean),badai_channel.activate(uuid,boolean),badai_channel.capabilities(uuid),badai_channel.send_test(uuid,integer,time,uuid,boolean) from public,anon,authenticated;
grant execute on function badai_channel.capabilities(uuid),badai_channel.send_test(uuid,integer,time,uuid,boolean) to authenticated;
revoke all on function public.wa_channel_capabilities(uuid),public.wa_channel_send_test(uuid,integer,time,uuid,boolean) from public,anon;
grant execute on function public.wa_channel_capabilities(uuid),public.wa_channel_send_test(uuid,integer,time,uuid,boolean) to authenticated;


create or replace function badai_channel.save_schedule(p_settings jsonb,p_slots jsonb,p_expected_version integer,p_confirm_enable boolean)
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
    perform badai_channel.activate(target,p_confirm_enable);
    if exists(select 1 from jsonb_to_recordset(p_slots) as x(content_id uuid) join public.wa_channel_contents c on c.id=x.content_id where c.image_path is null) then perform badai_channel.assert_ready_for(target,false); end if;
    if exists(select 1 from jsonb_to_recordset(p_slots) as x(content_id uuid) join public.wa_channel_contents c on c.id=x.content_id where c.image_path is not null) then perform badai_channel.assert_ready_for(target,true); end if;
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

create or replace function badai_channel.enqueue(p_settings_id uuid,p_day integer,p_time time,p_date date,p_request uuid default null)
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
  perform badai_channel.assert_ready_for(t.id,c.image_path is not null);
  elapsed:=greatest(0,p_date-s.start_date);
  insert into public.wa_channel_delivery_logs(settings_id,content_id,target_id,day_number,send_time,local_date,cycle_number,settings_version,requested_by,request_key,snapshot,session_fingerprint)
  values(s.id,c.id,t.id,p_day,p_time,p_date,elapsed/s.duration_days+1,s.version,s.created_by,p_request,
    jsonb_build_object('kind','channel','external_id',t.external_id,'target_name',t.name,'title',c.title,'content_text',c.caption,
      'message_type',case when c.image_path is null then 'text' else 'media' end,'media_path',c.image_path),badai_channel.fingerprint())
  on conflict do nothing returning id into result;
  return result;
end $$;

create or replace function badai_channel.send_now(p_settings_id uuid,p_day_number integer,p_send_time time,p_request_key uuid,p_confirm boolean)
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
  perform badai_channel.activate(s.target_id,p_confirm);
  result:=badai_channel.enqueue(s.id,p_day_number,p_send_time,(clock_timestamp() at time zone s.timezone)::date,p_request_key);
  return jsonb_build_object('id',result,'duplicate',false);
end $$;

create or replace function public.wa_channel_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.wa_marketing_live_settings; j public.wa_channel_delivery_logs;
begin
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  update public.wa_channel_delivery_logs set status=case when status='dispatching' then 'unknown' else 'failed' end,
    error_code=case when status='dispatching' then 'provider_outcome_uncertain' else 'preparation_expired' end,
    claim_token=null,lease_until=null,updated_at=clock_timestamp()
    where status in ('preparing','dispatching') and lease_until<=clock_timestamp();
  if cfg.active_job_id is not null or cfg.next_send_at>clock_timestamp()
    or exists(select 1 from public.wa_channel_delivery_logs where status in ('preparing','dispatching')) then return null; end if;
  select * into j from public.wa_channel_delivery_logs where status='queued' and (is_test or (cfg.enabled and cfg.scheduler_enabled)) order by created_at,id limit 1 for update skip locked;
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

create or replace function public.wa_channel_dispatch(p_id uuid,p_claim uuid,p_fingerprint text) returns boolean language plpgsql security definer set search_path='' as $$
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
  if not j.is_test then perform badai_channel.assert_ready_for(j.target_id,j.snapshot->>'message_type'='media'); end if;
  update public.wa_channel_delivery_logs set status='dispatching',lease_until=clock_timestamp()+interval '3 minutes',updated_at=clock_timestamp() where id=j.id;
  return true;
end $$;
