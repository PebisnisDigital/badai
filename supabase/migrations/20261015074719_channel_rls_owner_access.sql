-- RLS runs as the requesting authenticated role. The existing wa_live_owner()
-- is deliberately service-only, so Channel policies must use their own helper.
-- Keep the legacy function's grants and all live publication gates unchanged.
create function badai_channel.can_manage()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from public.admin_team_members
    where auth_user_id=auth.uid() and status='active' and role in ('owner','super_admin')
  );
$$;
revoke all on function badai_channel.can_manage() from public,anon,authenticated;
grant execute on function badai_channel.can_manage() to authenticated;

alter policy channel_settings_read on public.wa_channel_settings
  using((select badai_channel.can_manage()));
alter policy channel_contents_read on public.wa_channel_contents
  using((select badai_channel.can_manage()));
alter policy channel_contents_insert on public.wa_channel_contents
  with check((select badai_channel.can_manage()));
alter policy channel_contents_update on public.wa_channel_contents
  using((select badai_channel.can_manage())) with check((select badai_channel.can_manage()));
alter policy channel_slots_read on public.wa_channel_calendar_slots
  using((select badai_channel.can_manage()));
alter policy channel_logs_read on public.wa_channel_delivery_logs
  using((select badai_channel.can_manage()));
