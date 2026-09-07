-- Deploy the app, enable pg_cron/pg_net, and configure these Vault secrets first:
-- readiary_push_url: https://YOUR_PRODUCTION_DOMAIN/api/cron/push
-- readiary_cron_secret: same CRON_SECRET as the app; never put its value in source control.
do $$begin
 if not exists(select 1 from vault.decrypted_secrets where name='readiary_push_url' and decrypted_secret like 'https://%/api/cron/push')
 or not exists(select 1 from vault.decrypted_secrets where name='readiary_cron_secret' and length(decrypted_secret)>=32) then
 raise exception 'Configure the production URL and cron secret in Vault first';
 end if;
end$$;
select cron.schedule('readiary-web-push','*/5 * * * *',$job$
 select net.http_get(
  url := (select decrypted_secret from vault.decrypted_secrets where name='readiary_push_url'),
  headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='readiary_cron_secret')),
  timeout_milliseconds := 55000
 );
$job$);
-- Independent retention, including when application sending is disabled.
select cron.schedule('readiary-push-retention','20 18 * * *',$job$
 delete from public.push_deliveries where created_at < now() - interval '90 days';
$job$);
