-- Robust, idempotent migration for auth + core tables + storage policies

-- 0) Extension
create extension if not exists pgcrypto;

-- 1) Helper function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2) Enums (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_status') THEN
    CREATE TYPE public.trade_status AS ENUM ('pending','active','completed','disputed','cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_key') THEN
    CREATE TYPE public.achievement_key AS ENUM ('first_trade','loop_master','time_millionaire','community_builder');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE public.dispute_status AS ENUM ('open','in_review','resolved','rejected');
  END IF;
END $$;

-- 3) Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  phone text,
  location text,
  category text,
  trust_score int not null default 0,
  verification_phone boolean not null default false,
  verification_email boolean not null default false,
  verification_cac boolean not null default false,
  is_onboarded boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Drop/create policies deterministically
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Profiles are viewable by everyone') THEN
    EXECUTE 'drop policy "Profiles are viewable by everyone" on public.profiles';
  END IF;
  EXECUTE 'create policy "Profiles are viewable by everyone" on public.profiles for select using (true)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile') THEN
    EXECUTE 'drop policy "Users can update their own profile" on public.profiles';
  END IF;
  EXECUTE 'create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id)';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'profiles_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  hourly_rate numeric(10,2) not null default 0,
  availability boolean not null default true,
  skill_level text check (skill_level in ('Beginner','Intermediate','Expert')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='Services are viewable by everyone') THEN
    EXECUTE 'drop policy "Services are viewable by everyone" on public.services';
  END IF;
  EXECUTE 'create policy "Services are viewable by everyone" on public.services for select using (true)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='Users can manage their own services') THEN
    EXECUTE 'drop policy "Users can manage their own services" on public.services';
  END IF;
  EXECUTE 'create policy "Users can manage their own services" on public.services for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'services_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  service_offered_id uuid references public.services(id) on delete set null,
  service_requested_id uuid references public.services(id) on delete set null,
  hours_offered numeric(6,2) not null check (hours_offered > 0),
  hours_requested numeric(6,2) not null check (hours_requested > 0),
  status public.trade_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

alter table public.trades enable row level security;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trades' AND policyname='Participants can view trades') THEN
    EXECUTE 'drop policy "Participants can view trades" on public.trades';
  END IF;
  EXECUTE 'create policy "Participants can view trades" on public.trades for select using (auth.uid() = proposer_id or auth.uid() = provider_id)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trades' AND policyname='Participants can insert trades') THEN
    EXECUTE 'drop policy "Participants can insert trades" on public.trades';
  END IF;
  EXECUTE 'create policy "Participants can insert trades" on public.trades for insert with check (auth.uid() = proposer_id or auth.uid() = provider_id)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trades' AND policyname='Participants can update trades') THEN
    EXECUTE 'drop policy "Participants can update trades" on public.trades';
  END IF;
  EXECUTE 'create policy "Participants can update trades" on public.trades for update using (auth.uid() = proposer_id or auth.uid() = provider_id)';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trades_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER trades_updated_at BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.trade_messages enable row level security;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_messages' AND policyname='Participants can view messages') THEN
    EXECUTE 'drop policy "Participants can view messages" on public.trade_messages';
  END IF;
  EXECUTE 'create policy "Participants can view messages" on public.trade_messages for select using (exists (select 1 from public.trades t where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)))';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_messages' AND policyname='Participants can send messages') THEN
    EXECUTE 'drop policy "Participants can send messages" on public.trade_messages';
  END IF;
  EXECUTE 'create policy "Participants can send messages" on public.trade_messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.trades t where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)))';
END $$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null unique references public.trades(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Anyone can view reviews') THEN
    EXECUTE 'drop policy "Anyone can view reviews" on public.reviews';
  END IF;
  EXECUTE 'create policy "Anyone can view reviews" on public.reviews for select using (true)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Reviewer can create review') THEN
    EXECUTE 'drop policy "Reviewer can create review" on public.reviews';
  END IF;
  EXECUTE 'create policy "Reviewer can create review" on public.reviews for insert with check (auth.uid() = reviewer_id)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Reviewer can update review') THEN
    EXECUTE 'drop policy "Reviewer can update review" on public.reviews';
  END IF;
  EXECUTE 'create policy "Reviewer can update review" on public.reviews for update using (auth.uid() = reviewer_id)';
END $$;

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key public.achievement_key not null,
  level text,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.achievements enable row level security;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='achievements' AND policyname='Anyone can view achievements') THEN
    EXECUTE 'drop policy "Anyone can view achievements" on public.achievements';
  END IF;
  EXECUTE 'create policy "Anyone can view achievements" on public.achievements for select using (true)';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='achievements' AND policyname='Users can manage their achievements') THEN
    EXECUTE 'drop policy "Users can manage their achievements" on public.achievements';
  END IF;
  EXECUTE 'create policy "Users can manage their achievements" on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
END $$;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null unique references public.trades(id) on delete cascade,
  issue_type text,
  evidence jsonb not null default '[]'::jsonb,
  mediator_id uuid,
  status public.dispute_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.disputes enable row level security;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='disputes' AND policyname='Participants can view disputes') THEN
    EXECUTE 'drop policy "Participants can view disputes" on public.disputes';
  END IF;
  EXECUTE 'create policy "Participants can view disputes" on public.disputes for select using (exists (select 1 from public.trades t where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)))';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='disputes' AND policyname='Participants can create disputes') THEN
    EXECUTE 'drop policy "Participants can create disputes" on public.disputes';
  END IF;
  EXECUTE 'create policy "Participants can create disputes" on public.disputes for insert with check (exists (select 1 from public.trades t where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)))';

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='disputes' AND policyname='Participants can update disputes') THEN
    EXECUTE 'drop policy "Participants can update disputes" on public.disputes';
  END IF;
  EXECUTE 'create policy "Participants can update disputes" on public.disputes for update using (exists (select 1 from public.trades t where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)))';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'disputes_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Signup trigger -> profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, verification_email)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), true)
  on conflict (id) do nothing;
  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created' AND n.nspname = 'auth'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- 5) Storage: avatars bucket + policies
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Avatar images are publicly accessible'
  ) THEN
    EXECUTE 'drop policy "Avatar images are publicly accessible" on storage.objects';
  END IF;
  EXECUTE 'create policy "Avatar images are publicly accessible" on storage.objects for select using (bucket_id = ''avatars'')';

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload their own avatar'
  ) THEN
    EXECUTE 'drop policy "Users can upload their own avatar" on storage.objects';
  END IF;
  EXECUTE 'create policy "Users can upload their own avatar" on storage.objects for insert with check (bucket_id = ''avatars'' and auth.uid()::text = (storage.foldername(name))[1])';

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update their own avatar'
  ) THEN
    EXECUTE 'drop policy "Users can update their own avatar" on storage.objects';
  END IF;
  EXECUTE 'create policy "Users can update their own avatar" on storage.objects for update using (bucket_id = ''avatars'' and auth.uid()::text = (storage.foldername(name))[1])';
END $$;