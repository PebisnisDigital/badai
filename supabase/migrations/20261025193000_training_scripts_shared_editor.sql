-- BADAI training scripts collaborative editor.
-- Apply to BADAI Supabase project. Uses the existing private.team_role() helper.
create table if not exists public.training_script_documents (
 day smallint primary key check (day in (1,2)),
 content jsonb not null check (jsonb_typeof(content)='array' and jsonb_array_length(content) between 1 and 900 and octet_length(content::text)<=1000000),
 revision integer not null default 1 check (revision>0),
 updated_by uuid default auth.uid(),
 updated_at timestamptz not null default now()
);
alter table public.training_script_documents enable row level security;
revoke all on table public.training_script_documents from public, anon;
grant select,insert,update on table public.training_script_documents to authenticated;
drop policy if exists training_script_team_read on public.training_script_documents;
drop policy if exists training_script_team_create on public.training_script_documents;
drop policy if exists training_script_team_update on public.training_script_documents;
create policy training_script_team_read on public.training_script_documents
 for select to authenticated
 using ((select private.team_role()) in ('owner','super_admin','admin','marketing','mentor'));
create policy training_script_team_create on public.training_script_documents
 for insert to authenticated
 with check ((select private.team_role()) in ('owner','super_admin','admin','marketing','mentor') and updated_by=(select auth.uid()));
create policy training_script_team_update on public.training_script_documents
 for update to authenticated
 using ((select private.team_role()) in ('owner','super_admin','admin','marketing','mentor'))
 with check ((select private.team_role()) in ('owner','super_admin','admin','marketing','mentor') and updated_by=(select auth.uid()));
create or replace function public.save_training_script(p_day smallint,p_expected_revision integer,p_content jsonb)
 returns table(day smallint,revision integer,updated_at timestamptz)
 language sql security invoker set search_path=''
 as $$
 update public.training_script_documents as d
 set content=p_content,revision=d.revision+1,updated_by=(select auth.uid()),updated_at=now()
 where d.day=p_day and d.revision=p_expected_revision
 returning d.day,d.revision,d.updated_at;
 $$;
revoke all on function public.save_training_script(smallint,integer,jsonb) from public,anon;
grant execute on function public.save_training_script(smallint,integer,jsonb) to authenticated;
comment on table public.training_script_documents is 'Internal BADAI training editor, team-only RLS and optimistic revision control.';
