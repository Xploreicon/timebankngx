-- Enable required extension
create extension if not exists pgcrypto;

-- 1) Helper function to maintain updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2) Enums
create type public.trade_status as enum ('pending','active','completed','disputed','cancelled');
create type public.achievement_key as enum ('first_trade','loop_master','time_millionaire','community_builder');
create type public.dispute_status as enum ('open','in_review','resolved','rejected');

-- 3) Profiles table
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

-- Profiles policies
create policy if not exists "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy if not exists "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Trigger for updated_at
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

-- 4) Services table
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

create policy if not exists "Services are viewable by everyone"
  on public.services for select using (true);

create policy if not exists "Users can manage their own services"
  on public.services for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

-- 5) Trades table
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

create policy if not exists "Participants can view trades"
  on public.trades for select
  using (auth.uid() = proposer_id or auth.uid() = provider_id);

create policy if not exists "Participants can insert trades"
  on public.trades for insert
  with check (auth.uid() = proposer_id or auth.uid() = provider_id);

create policy if not exists "Participants can update trades"
  on public.trades for update
  using (auth.uid() = proposer_id or auth.uid() = provider_id);

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

-- 6) Trade messages
create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.trade_messages enable row level security;

create policy if not exists "Participants can view messages"
  on public.trade_messages for select
  using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy if not exists "Participants can send messages"
  on public.trade_messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

-- 7) Reviews
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

create policy if not exists "Anyone can view reviews"
  on public.reviews for select using (true);

create policy if not exists "Reviewer can create review"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

create policy if not exists "Reviewer can update review"
  on public.reviews for update
  using (auth.uid() = reviewer_id);

-- 8) Achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key public.achievement_key not null,
  level text,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.achievements enable row level security;

create policy if not exists "Anyone can view achievements"
  on public.achievements for select using (true);

create policy if not exists "Users can manage their achievements"
  on public.achievements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9) Disputes
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

create policy if not exists "Participants can view disputes"
  on public.disputes for select
  using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy if not exists "Participants can create disputes"
  on public.disputes for insert
  with check (
    exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy if not exists "Participants can update disputes"
  on public.disputes for update
  using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

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

-- 10) Create profile on auth signup
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

-- 11) Storage bucket and policies for avatars
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Public can view avatars
create policy if not exists "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload their own avatar (path must start with their uid)
create policy if not exists "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );