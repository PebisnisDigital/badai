-- Preserve fixed per-recipient overrides in real queues. Fresh environments
-- already receive this definition from the base migration.
begin;
create or replace function public.wa_live_enqueue(p_actor uuid,p_campaign_id uuid,p_target_ids uuid[],p_mode text,p_request_key uuid,p_fingerprint text)
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

commit;
