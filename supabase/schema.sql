create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'user' check (role in ('user','admin')),
  plan text not null default 'Essencial',
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  concern text not null,
  intensity smallint not null check (intensity between 1 and 10),
  duration text not null,
  impacts text[] not null default '{}',
  goal text not null,
  safety text not null default 'no',
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','active','closed','escalated')),
  queue_position integer not null default 0,
  safety_flag boolean not null default false,
  summary text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  input_mode text not null default 'text' check (input_mode in ('text','audio')),
  created_at timestamptz not null default now()
);

create table if not exists public.safety_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  level text not null check (level in ('attention','crisis','emergency')),
  matched_rule text not null,
  action_taken text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Geral',
  storage_path text not null unique,
  mime_type text not null,
  status text not null default 'processing' check (status in ('processing','active','archived','failed')),
  chunk_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  content text not null,
  page integer,
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_created_idx on public.assessments(user_id, created_at desc);
create index if not exists sessions_user_started_idx on public.sessions(user_id, started_at desc);
create index if not exists messages_session_created_idx on public.messages(session_id, created_at);

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "assessments_own" on public.assessments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_own" on public.sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_own" on public.messages for all using (
  exists(select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
) with check (
  exists(select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
);

