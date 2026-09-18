-- The excerpt helper is used by the authenticated search RPC only.
revoke all on function public.search_excerpt(text,text) from public, anon;
grant execute on function public.search_excerpt(text,text) to authenticated;
