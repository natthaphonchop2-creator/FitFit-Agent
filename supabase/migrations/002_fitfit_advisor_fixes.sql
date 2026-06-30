create index if not exists workout_exercises_workout_session_id_idx
  on public.workout_exercises(workout_session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.match_rag_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  metadata_filter jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  source text,
  uri text,
  tags text[],
  metadata jsonb,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id as chunk_id,
    d.id as document_id,
    d.title,
    c.content,
    d.source,
    d.uri,
    d.tags,
    c.metadata || d.metadata as metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  where c.embedding is not null
    and (metadata_filter = '{}'::jsonb or (c.metadata || d.metadata) @> metadata_filter)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.match_rag_chunks(extensions.vector, integer, jsonb) from public, anon, authenticated;
grant execute on function public.match_rag_chunks(extensions.vector, integer, jsonb) to service_role;
