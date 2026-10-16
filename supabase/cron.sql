-- Run once, after schema.sql. Replace PROJECT_REF with your Supabase project reference (the part before .supabase.co).
-- Needs the pg_cron, pg_net extensions (Database > Extensions) and Vault (on by default).
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'soc_cron_key') then perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'soc_cron_key'); end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname in ('soc-enqueue', 'soc-send');
-- 14:00 UTC daily: queue today's reminders (9am Dallas in winter, 8am in summer)
select cron.schedule('soc-enqueue', '0 14 * * *', $$ select soc_enqueue_reminders() $$);
-- every hour: deliver whatever is queued
select cron.schedule('soc-send', '5 * * * *', $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/soc-send-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'soc_cron_key')),
    body := '{}'::jsonb) $$);
