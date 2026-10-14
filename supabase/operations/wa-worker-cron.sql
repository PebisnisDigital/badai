-- Run only AFTER auditing the live backend, deploying badai-wa-send, and placing
-- the SAME generated secret in Edge WA_MARKETING_WORKER_SECRET and Supabase
-- Vault as badai_wa_worker_secret. Apply the worker-proofs migration first.
-- Never paste that value in Git, console logs, or pg_net request headers.
-- This registers polling only. All feature gates remain disabled by default.
-- Requires pg_cron >=1.5 for sub-minute schedules and pg_net.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Supabase owns these HTTP tables and can grant PUBLIC access. Only short-lived,
-- single-use operation proofs may be passed through them, never master secrets.
do $$ begin
  if not exists(select 1 from vault.secrets where name='badai_wa_worker_secret') then
    raise exception 'Configure badai_wa_worker_secret in Vault before registering the worker';
  end if;
  if exists(select 1 from cron.job where jobname='badai-wa-live-worker') then
    perform cron.unschedule('badai-wa-live-worker');
  end if;
end $$;
select cron.schedule('badai-wa-live-worker','10 seconds',$worker$
  select net.http_post(
    url := 'https://tlvxlekqrllkvcpgwmic.supabase.co/functions/v1/badai-wa-send',
    headers := public.wa_live_issue_worker_token(),
    body := '{"action":"worker"}'::jsonb,
    timeout_milliseconds := 120000
  ) where exists(select 1 from public.wa_marketing_live_settings where singleton
      and (testing_enabled or enabled));
$worker$);
commit;
