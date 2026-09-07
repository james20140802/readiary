import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE??'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec(await readFile(new URL('./privacy-fixture-schema.sql',import.meta.url),'utf8'));
 await db.exec('create role service_role bypassrls; grant usage on schema public,auth to service_role; grant all on all tables in schema public to service_role;');
 await db.exec(await readFile(new URL('../migrations/20260907120231_web_push_reminders.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('./push_contract.sql',import.meta.url),'utf8'));
 console.log('PASS: push SQL permissions, eligibility, consent, cadence, dedup and deletion');
}catch(e){console.error(e.message,e.code,e.where??'');process.exitCode=1;}finally{await db.close();}
