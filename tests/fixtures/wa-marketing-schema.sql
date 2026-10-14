-- A minimal local fixture derived from the checked-in UI, NOT an export of the
-- live database. Production schema compatibility must be audited before deploy.
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema vault;
create table vault.decrypted_secrets(name text,decrypted_secret text);
insert into vault.decrypted_secrets values('badai_wa_worker_secret','fixture-secret-at-least-32-characters-long');
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.admin_team_members(auth_user_id uuid primary key,role text,status text);
create table public.wa_marketing_targets(id uuid primary key,name text,kind text,external_id text,enabled boolean,origin text);
create table public.wa_marketing_campaigns(id uuid primary key,name text,content_text text,scheduled_at timestamptz,delivery_mode text,status text,delay_seconds integer,jitter_seconds integer,delay_min_seconds integer,delay_max_seconds integer,message_type text,media_path text,cta_url text);
create table public.wa_marketing_campaign_targets(campaign_id uuid,target_id uuid,position integer,delay_seconds integer,primary key(campaign_id,target_id));
create table public.wa_marketing_delivery_plan(campaign_id uuid,status text);
