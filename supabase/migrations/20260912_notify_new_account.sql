-- Push notification on every BRAND NEW account (not per league connect).
--
-- Fires once per auth.users insert — the same event the existing
-- on_auth_user_created trigger uses to create the profile row, so
-- "one account, many leagues" can never double-fire this.
--
-- SHARED BACKEND: auth.users is shared with Ultimate Fantasy
-- Dashboard, so this announces signups from EITHER product. The
-- message carries the provider and any origin metadata the row has.
--
-- Delivery is ntfy.sh: the topic name is the only secret, and it
-- lives in this function. pg_net queues the HTTP call asynchronously,
-- so a slow or down ntfy can never slow down or fail a signup; the
-- EXCEPTION guard covers everything else — an alert must never cost
-- an account.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_account()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  account_count bigint;
begin
  select count(*) into account_count from auth.users;

  perform net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_build_object(
      'topic',   'tlb-signups-58e7b120505e',
      'title',   'New account · #' || account_count,
      'message',
        coalesce(NEW.email, '(no email)')
        || '  ·  ' || coalesce(NEW.raw_app_meta_data->>'provider', 'unknown provider'),
      'tags',    jsonb_build_array('rolled_up_newspaper')
    )
  );
  return NEW;
exception when others then
  -- Alerting is best-effort; the signup itself is not.
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function public.notify_new_account();
