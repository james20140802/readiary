-- 유예가 끝난 탈퇴 계정을 매일 완전히 지우는 정기 작업.
-- 먼저 앱을 배포하고 pg_cron/pg_net을 켠 뒤, Vault에 다음 비밀값을 설정한다.
-- readiary_account_deletion_url: https://YOUR_PRODUCTION_DOMAIN/api/cron/account-deletion
-- readiary_cron_secret: enable-push-cron.sql에서 쓴 것과 같은 CRON_SECRET. 값은 소스에 넣지 않는다.
do $$begin
 if not exists(select 1 from vault.decrypted_secrets where name='readiary_account_deletion_url' and decrypted_secret like 'https://%/api/cron/account-deletion')
 or not exists(select 1 from vault.decrypted_secrets where name='readiary_cron_secret' and length(decrypted_secret)>=32) then
 raise exception 'Configure the production URL and cron secret in Vault first';
 end if;
end$$;
-- 다시 실행해도 안전하도록 기존 작업을 먼저 해제한다.
select cron.unschedule(jobid) from cron.job where jobname='readiary-account-deletion';
-- 매일 KST 04:17 (UTC 19:17)
select cron.schedule('readiary-account-deletion','17 19 * * *',$job$
 select net.http_get(
  url := (select decrypted_secret from vault.decrypted_secrets where name='readiary_account_deletion_url'),
  headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='readiary_cron_secret')),
  timeout_milliseconds := 55000
 );
$job$);
