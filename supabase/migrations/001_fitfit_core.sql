create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  display_name text,
  picture_url text,
  status_message text,
  locale text default 'th-TH',
  consent_status text not null default 'unknown'
    check (consent_status in ('unknown', 'granted', 'revoked')),
  source text not null default 'line',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  goal text,
  sex text,
  birth_year integer check (birth_year between 1900 and 2100),
  height_cm numeric(5,2) check (height_cm > 0),
  activity_level text,
  workout_days_per_week integer check (workout_days_per_week between 0 and 14),
  available_minutes integer check (available_minutes between 0 and 300),
  equipment text[] not null default '{}',
  injuries text[] not null default '{}',
  food_budget_daily numeric(10,2) check (food_budget_daily >= 0),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id)
);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) check (weight_kg > 0),
  waist_cm numeric(6,2) check (waist_cm > 0),
  body_fat_percent numeric(5,2) check (body_fat_percent >= 0 and body_fat_percent <= 100),
  note text,
  source text not null default 'line',
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  title text,
  goal text,
  duration_minutes integer check (duration_minutes >= 0 and duration_minutes <= 600),
  perceived_exertion integer check (perceived_exertion between 1 and 10),
  note text,
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  muscle_groups text[] not null default '{}',
  sets integer check (sets >= 0 and sets <= 100),
  reps integer check (reps >= 0 and reps <= 1000),
  weight_kg numeric(7,2) check (weight_kg >= 0),
  distance_km numeric(8,3) check (distance_km >= 0),
  duration_seconds integer check (duration_seconds >= 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_type text,
  description text not null,
  calories_kcal numeric(8,2) check (calories_kcal >= 0),
  protein_g numeric(8,2) check (protein_g >= 0),
  carbs_g numeric(8,2) check (carbs_g >= 0),
  fat_g numeric(8,2) check (fat_g >= 0),
  cost_thb numeric(10,2) check (cost_thb >= 0),
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  line_user_id text,
  event_type text not null,
  message_type text,
  message_text text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  uri text,
  language text not null default 'th',
  audience text not null default 'general',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, title)
);

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer check (token_count is null or token_count >= 0),
  embedding extensions.vector(1536),
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists customers_line_user_id_idx on public.customers(line_user_id);
create index if not exists customer_events_customer_id_created_at_idx on public.customer_events(customer_id, created_at desc);
create index if not exists body_metrics_customer_id_measured_at_idx on public.body_metrics(customer_id, measured_at desc);
create index if not exists workout_sessions_customer_id_started_at_idx on public.workout_sessions(customer_id, started_at desc);
create index if not exists food_logs_customer_id_logged_at_idx on public.food_logs(customer_id, logged_at desc);
create index if not exists rag_documents_tags_idx on public.rag_documents using gin(tags);
create index if not exists rag_chunks_document_id_idx on public.rag_chunks(document_id);
create index if not exists rag_chunks_embedding_idx
  on public.rag_chunks using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
create trigger customer_profiles_set_updated_at
before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists rag_documents_set_updated_at on public.rag_documents;
create trigger rag_documents_set_updated_at
before update on public.rag_documents
for each row execute function public.set_updated_at();

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

alter table public.customers enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.body_metrics enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.food_logs enable row level security;
alter table public.customer_events enable row level security;
alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.match_rag_chunks(extensions.vector, integer, jsonb) from public, anon, authenticated;
grant execute on function public.match_rag_chunks(extensions.vector, integer, jsonb) to service_role;
