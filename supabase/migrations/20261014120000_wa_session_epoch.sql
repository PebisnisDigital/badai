-- Zawa PUT /session keeps id and sessionId while resetting the WhatsApp link.
-- Null preserves existing fingerprints. Only an explicitly authorized reset
-- rotates this private epoch; previous delivery evidence remains untouched.
begin;
alter table public.wa_marketing_connection_secure add column if not exists session_epoch uuid;
comment on column public.wa_marketing_connection_secure.session_epoch is
  'Private pairing generation; rotate before an explicitly approved Zawa reset';
commit;
