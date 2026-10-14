begin;
create table public.wa_marketing_live_worker_tokens (
  nonce uuid primary key,
  issued_at timestamptz not null,
  used_at timestamptz
);
alter table public.wa_marketing_live_worker_tokens enable row level security;
revoke all on public.wa_marketing_live_worker_tokens from public,anon,authenticated;
grant all on public.wa_marketing_live_worker_tokens to service_role;

-- pg_net queue ACLs are controlled by Supabase. Never enqueue master secrets;
-- enqueue a 30-second HMAC proof restricted to one worker wake-up instead.
create function public.wa_live_issue_worker_token() returns jsonb
language plpgsql security definer set search_path='' as $$
declare nonce uuid:=gen_random_uuid(); issued timestamptz:=clock_timestamp(); stamp bigint;
  secret text; signature text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name='badai_wa_worker_secret';
  if secret is null or length(secret)<32 then raise exception 'wa_worker_not_configured'; end if;
  stamp:=floor(extract(epoch from issued))::bigint;
  signature:=encode(extensions.hmac('badai-wa-worker:'||stamp::text||':'||nonce::text,secret,'sha256'),'hex');
  delete from public.wa_marketing_live_worker_tokens where issued_at<issued-interval '10 minutes';
  insert into public.wa_marketing_live_worker_tokens(nonce,issued_at) values(nonce,issued);
  return jsonb_build_object('Content-Type','application/json','x-wa-worker-nonce',nonce,
    'x-wa-worker-time',stamp::text,'x-wa-worker-signature',signature);
end $$;
create function public.wa_live_consume_worker_token(p_nonce uuid,p_timestamp bigint) returns boolean
language plpgsql security definer set search_path='' as $$
declare consumed uuid;
begin
  update public.wa_marketing_live_worker_tokens set used_at=clock_timestamp()
    where nonce=p_nonce and used_at is null and floor(extract(epoch from issued_at))::bigint=p_timestamp
      and issued_at>clock_timestamp()-interval '30 seconds' and issued_at<=clock_timestamp()+interval '5 seconds'
    returning nonce into consumed;
  return consumed is not null;
end $$;
revoke all on function public.wa_live_issue_worker_token(),public.wa_live_consume_worker_token(uuid,bigint) from public,anon,authenticated;
grant execute on function public.wa_live_issue_worker_token(),public.wa_live_consume_worker_token(uuid,bigint) to service_role;
commit;
