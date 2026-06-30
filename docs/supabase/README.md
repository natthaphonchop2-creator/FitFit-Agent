# FitFit Supabase Setup

This project uses Supabase for two data groups:

- RAG knowledge base: `rag_documents`, `rag_chunks`, and `match_rag_chunks`
- Customer data: LINE customers, profiles, body metrics, workout logs, food logs, and raw customer events

## Current Safety Model

- The LINE webhook still does not auto-reply.
- If Supabase env vars are missing, webhook event storage is skipped.
- Server code uses `SUPABASE_SERVICE_ROLE_KEY` only on the backend.
- RLS is enabled on every public table.
- No `anon` or `authenticated` RLS policies are created yet, so customer data is not exposed to browser clients.

## Required Env Vars

```bash
SUPABASE_URL=https://rlffuertznkgbwaffizx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
```

Add them to `.env.local` for local development and to Render env vars for production.

## FitFit Project

- Project name: `FitFit`
- Project ref: `rlffuertznkgbwaffizx`
- API URL: `https://rlffuertznkgbwaffizx.supabase.co`
- Region: `ap-northeast-1`

## Applied Schema

Applied migrations:

```text
supabase/migrations/001_fitfit_core.sql
supabase/migrations/002_fitfit_advisor_fixes.sql
```

Applied starter RAG content:

```text
supabase/seeds/001_fitfit_rag_seed.sql
```

Current verification:

- `rag_documents`: 3 rows
- `rag_chunks`: 3 rows
- `customers`: 0 rows
- `customer_events`: 0 rows
- `vector` extension: enabled
- `match_rag_chunks`: installed
- RLS: enabled on all app tables

After applying it, verify:

```sql
select to_regclass('public.customers') as customers_table;
select to_regclass('public.rag_chunks') as rag_chunks_table;
select extname from pg_extension where extname in ('vector', 'pgcrypto');
```

## RAG Flow

1. Insert one row per source into `rag_documents`.
2. Split the source into chunks and insert rows into `rag_chunks`.
3. Generate embeddings with a 1536-dimension embedding model.
4. Store vectors in `rag_chunks.embedding`.
5. Query with `public.match_rag_chunks(query_embedding, match_count, metadata_filter)`.

The current schema is sized for 1536-dimension embeddings, such as OpenAI `text-embedding-3-small`.
