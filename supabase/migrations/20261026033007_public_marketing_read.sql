-- Only the 51 marketing cards (day 5) are public. Internal training days
-- and all write operations remain restricted to authenticated BADAI staff.
alter table public.training_script_documents enable row level security;

revoke all on table public.training_script_documents from anon;
grant select (day, revision, content)
  on table public.training_script_documents to anon;

drop policy if exists training_script_public_marketing_read
  on public.training_script_documents;
create policy training_script_public_marketing_read
  on public.training_script_documents
  for select to anon
  using (day = 5);
