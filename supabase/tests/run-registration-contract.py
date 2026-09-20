"""Real PostgreSQL concurrency/RLS contract. Requires isolated Docker container argument.
Example: python3 supabase/tests/run-registration-contract.py readiary-duplicate-contract
Never point this runner at production: it initializes the empty test database.
"""
import concurrent.futures
import pathlib
import subprocess
import sys

container = sys.argv[1]
root = pathlib.Path(__file__).resolve().parent

def sql(source, check=True):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], input=source, text=True, capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result

sql((root / 'privacy-fixture-schema.sql').read_text())
sql('''alter table books add constraint books_isbn_key unique(isbn);
alter table books enable row level security;
alter table user_books enable row level security;
create policy books_read on books for select to authenticated using(true);
create policy books_insert on books for insert to authenticated with check(true);
create policy ub_read on user_books for select to authenticated using(user_id=auth.uid());
create policy ub_insert on user_books for insert to authenticated with check(user_id=auth.uid());
create policy ub_delete on user_books for delete to authenticated using(user_id=auth.uid());
insert into auth.users values ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');''')
sql((root.parent / 'migrations/20260920150543_register_book_idempotently.sql').read_text())

# Direct RPC calls must enforce the same page constraint as the HTTP route.
for invalid_pages in [0, -1]:
    rejected = sql(f"set role authenticated; set request.jwt.claims='{{\"sub\":\"10000000-0000-4000-8000-000000000001\"}}'; select register_book_idempotently(gen_random_uuid(),'Invalid pages','Author',{invalid_pages});", False)
    assert rejected.returncode != 0 and 'Total pages must be positive' in rejected.stderr
assert sql('select count(*) from books;').stdout.strip() == '0'
assert sql('select count(*) from user_books;').stdout.strip() == '0'
assert sql('select count(*) from book_registration_requests;').stdout.strip() == '0'

def call(request='20000000-0000-4000-8000-000000000001', title='Book', owner=1, isbn='null', check=True):
    return sql(f'''set role authenticated;
set request.jwt.claims='{{"sub":"10000000-0000-4000-8000-{owner:012d}"}}';
select public.register_book_idempotently('{request}','{title}','Author',null,{isbn},null);''', check)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(lambda _: call().stdout, range(8)))
assert sum('"replayed": false' in item for item in results) == 1, results
assert sum('"replayed": true' in item for item in results) == 7, results
assert sql('select count(*) from user_books;').stdout.strip() == '1'
assert call(title='Changed', check=False).returncode != 0
assert sql('select count(*) from books;').stdout.strip() == '1'
# UUID is scoped to owner, not globally shared.
assert '"replayed": false' in call(owner=2).stdout
assert sql('select count(*) from user_books;').stdout.strip() == '2'
# Shared ISBN reuses book while retaining independent registration attempts.
a = call('20000000-0000-4000-8000-000000000002', isbn="'978-test'")
b = call('20000000-0000-4000-8000-000000000003', title='Different metadata', isbn="'978-test'")
assert sql("select count(*) from books where isbn='978-test' and title='Book';").stdout.strip() == '1'
# A failed shelf write rolls back the book AND result ledger.
sql("alter table user_books add constraint test_forced_failure check(user_id <> '10000000-0000-4000-8000-000000000001') not valid;")
assert call('20000000-0000-4000-8000-000000000004', title='Rollback', check=False).returncode != 0
assert sql("select count(*) from books where title='Rollback';").stdout.strip() == '0'
assert sql("select count(*) from book_registration_requests where request_id='20000000-0000-4000-8000-000000000004';").stdout.strip() == '0'
sql('alter table user_books drop constraint test_forced_failure;')
# Results cannot be updated/deleted by authenticated callers or read across owners.
prefix = "set role authenticated; set request.jwt.claims='{\"sub\":\"10000000-0000-4000-8000-000000000002\"}';"
assert sql(prefix + 'delete from book_registration_requests;', False).returncode != 0
assert sql(prefix + "update book_registration_requests set payload='{}';", False).returncode != 0
assert sql(prefix + 'select count(*) from book_registration_requests;').stdout.strip().splitlines()[-1] == '1'
assert sql("set role anon; select public.register_book_idempotently(gen_random_uuid(),'x','y');", False).returncode != 0
# Removing the resulting book from the shelf must not recreate it on retry.
sql("delete from user_books where id=(select user_book_id from book_registration_requests where user_id='10000000-0000-4000-8000-000000000002');")
assert '"replayed": true' in call(owner=2).stdout
# Empty optional strings normalize to null at the database boundary too.
normalized = sql("set role authenticated; set request.jwt.claims='{\"sub\":\"10000000-0000-4000-8000-000000000001\"}'; select register_book_idempotently('20000000-0000-4000-8000-000000000001',' Book ',' Author ',null,' ',' ');")
assert '\"replayed\": true' in normalized.stdout
# Distinct concurrent registration IDs still share the single ISBN book row.
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(lambda n: call(f'30000000-0000-4000-8000-{n:012d}', isbn="'concurrent-isbn'"), range(4)))
assert sql("select count(*) from books where isbn='concurrent-isbn';").stdout.strip() == '1'
# Conflicting payloads racing under one request ID have exactly one winner.
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    conflicting = list(pool.map(lambda title: call('40000000-0000-4000-8000-000000000001', title=title, check=False), ['Race A', 'Race B']))
assert sum(result.returncode == 0 for result in conflicting) == 1
assert sql("select count(*) from books where title in ('Race A','Race B');").stdout.strip() == '1'
print('PASS: 8 concurrent retries, payload conflict, owner isolation, shared ISBN, rollback, immutable replay after removal, RLS and anonymous denial')
