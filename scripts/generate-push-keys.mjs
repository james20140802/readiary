// Writes once to an ignored file with owner-only permissions. Never prints secrets.
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import webpush from 'web-push';
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
writeFileSync(
  '.env.push.local',
  [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + publicKey,
    'VAPID_PRIVATE_KEY=' + privateKey,
    'CRON_SECRET=' + randomBytes(32).toString('hex'),
    'PUSH_ENABLED=false',
    '',
  ].join('\n'),
  { mode: 0o600, flag: 'wx' }
);
process.stdout.write('Created ignored .env.push.local with permissions 0600. Never commit these values.\n');
