-- Enable required extension
create extension if not exists pgcrypto;

-- ============================================
-- 1) Helper function to maintain updated_at
-- ============================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- 2) Enums
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.trade_status AS ENUM ('pending','active','completed','disputed','cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.achievement_key AS ENUM ('first_trade','loop_master','time_millionaire','community_builder');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.dispute_status AS ENUM ('open','in_review','resolved','rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.skill_level AS ENUM ('Beginner','Intermediate','Expert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3) Profiles table
-- ============================================
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

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

-- Create policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Create index for email lookups
create index if not exists idx_profiles_email on public.profiles(email);

-- Trigger for updated_at
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- ============================================
-- 4) Services table
-- ============================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  hourly_rate numeric(10,2) not null default 0 check (hourly_rate >= 0),
  availability boolean not null default true,
  skill_level public.skill_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.services enable row level security;

-- Drop existing policies
drop policy if exists "Services are viewable by everyone" on public.services;
drop policy if exists "Users can manage their own services" on public.services;

-- Create policies
create policy "Services are viewable by everyone"
  on public.services for select using (true);

create policy "Users can insert their own services"
  on public.services for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own services"
  on public.services for update
  using (auth.uid() = user_id);

create policy "Users can delete their own services"
  on public.services for delete
  using (auth.uid() = user_id);

-- Create indexes
create index if not exists idx_services_user_id on public.services(user_id);
create index if not exists idx_services_category on public.services(category);
create index if not exists idx_services_availability on public.services(availability);

-- Trigger for updated_at
drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at before update on public.services
  for each row execute function public.update_updated_at_column();

-- ============================================
-- 5) Trades table
-- ============================================
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  service_offered_id uuid references public.services(id) on delete cascade,
  service_requested_id uuid references public.services(id) on delete cascade,
  hours_offered numeric(6,2) not null check (hours_offered > 0),
  hours_requested numeric(6,2) not null check (hours_requested > 0),
  status public.trade_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint check_different_parties check (proposer_id != provider_id),
  constraint check_completion_date check (
    (status = 'completed' and completed_at is not null) or
    (status != 'completed' and completed_at is null)
  ),
  constraint check_cancellation_date check (
    (status = 'cancelled' and cancelled_at is not null) or
    (status != 'cancelled' and cancelled_at is null)
  )
);

-- Enable RLS
alter table public.trades enable row level security;

-- Drop existing policies
drop policy if exists "Participants can view trades" on public.trades;
drop policy if exists "Participants can insert trades" on public.trades;
drop policy if exists "Participants can update trades" on public.trades;

-- Create policies
create policy "Participants can view trades"
  on public.trades for select
  using (auth.uid() = proposer_id or auth.uid() = provider_id);

create policy "Users can propose trades"
  on public.trades for insert
  with check (auth.uid() = proposer_id);

create policy "Participants can update trades"
  on public.trades for update
  using (auth.uid() = proposer_id or auth.uid() = provider_id);

-- Create indexes
create index if not exists idx_trades_proposer_id on public.trades(proposer_id);
create index if not exists idx_trades_provider_id on public.trades(provider_id);
create index if not exists idx_trades_status on public.trades(status);
create index if not exists idx_trades_created_at on public.trades(created_at desc);

-- Trigger for updated_at
drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at before update on public.trades
  for each row execute function public.update_updated_at_column();

-- ============================================
-- 6) Trade messages
-- ============================================
create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.trade_messages enable row level security;

-- Drop existing policies
drop policy if exists "Participants can view messages" on public.trade_messages;
drop policy if exists "Participants can send messages" on public.trade_messages;

-- Create policies
create policy "Participants can view messages"
  on public.trade_messages for select
  using (
    exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy "Participants can send messages"
  on public.trade_messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

-- Create indexes
create index if not exists idx_trade_messages_trade_id on public.trade_messages(trade_id);
create index if not exists idx_trade_messages_sender_id on public.trade_messages(sender_id);
create index if not exists idx_trade_messages_created_at on public.trade_messages(created_at);

-- ============================================
-- 7) Reviews
-- ============================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint unique_review_per_user_per_trade unique (trade_id, reviewer_id),
  constraint check_review_participants check (reviewer_id != reviewee_id)
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Drop existing policies
drop policy if exists "Anyone can view reviews" on public.reviews;
drop policy if exists "Reviewer can create review" on public.reviews;
drop policy if exists "Reviewer can update review" on public.reviews;
drop policy if exists "Reviewer can delete review" on public.reviews;

-- Create policies
create policy "Anyone can view reviews"
  on public.reviews for select using (true);

create policy "Reviewer can create review"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id and
    exists (
      select 1 from public.trades t
      where t.id = trade_id 
      and t.status = 'completed'
      and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy "Reviewer can update review"
  on public.reviews for update
  using (auth.uid() = reviewer_id);

create policy "Reviewer can delete review"
  on public.reviews for delete
  using (auth.uid() = reviewer_id);

-- Create indexes
create index if not exists idx_reviews_trade_id on public.reviews(trade_id);
create index if not exists idx_reviews_reviewee_id on public.reviews(reviewee_id);
create index if not exists idx_reviews_reviewer_id on public.reviews(reviewer_id);
create index if not exists idx_reviews_rating on public.reviews(rating);

-- ============================================
-- 8) Achievements
-- ============================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key public.achievement_key not null,
  level text,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

-- Enable RLS
alter table public.achievements enable row level security;

-- Drop existing policies
drop policy if exists "Anyone can view achievements" on public.achievements;
drop policy if exists "Users can manage their achievements" on public.achievements;

-- Create policies
create policy "Anyone can view achievements"
  on public.achievements for select using (true);

-- Achievements should typically be system-managed, not user-managed
-- Consider using a service role or trigger instead
create policy "System can manage achievements"
  on public.achievements for all
  using (false)  -- This prevents direct user manipulation
  with check (false);

-- Create indexes
create index if not exists idx_achievements_user_id on public.achievements(user_id);
create index if not exists idx_achievements_key on public.achievements(key);

-- ============================================
-- 9) Disputes
-- ============================================
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null unique references public.trades(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  issue_type text not null,
  description text,
  evidence jsonb not null default '[]'::jsonb,
  mediator_id uuid references auth.users(id) on delete set null,
  status public.dispute_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint check_resolution_date check (
    (status in ('resolved', 'rejected') and resolved_at is not null) or
    (status in ('open', 'in_review') and resolved_at is null)
  )
);

-- Enable RLS
alter table public.disputes enable row level security;

-- Drop existing policies
drop policy if exists "Participants can view disputes" on public.disputes;
drop policy if exists "Participants can create disputes" on public.disputes;
drop policy if exists "Participants can update disputes" on public.disputes;

-- Create policies
create policy "Participants and mediators can view disputes"
  on public.disputes for select
  using (
    auth.uid() = mediator_id or
    auth.uid() = reporter_id or
    exists (
      select 1 from public.trades t
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy "Participants can create disputes"
  on public.disputes for insert
  with check (
    auth.uid() = reporter_id and
    exists (
      select 1 from public.trades t
      where t.id = trade_id 
      and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
      and t.status in ('active', 'completed')
    )
  );

create policy "Participants can update open disputes"
  on public.disputes for update
  using (
    (status = 'open' and auth.uid() = reporter_id) or
    (auth.uid() = mediator_id and status != 'open')
  );

-- Create indexes
create index if not exists idx_disputes_trade_id on public.disputes(trade_id);
create index if not exists idx_disputes_status on public.disputes(status);
create index if not exists idx_disputes_reporter_id on public.disputes(reporter_id);
create index if not exists idx_disputes_mediator_id on public.disputes(mediator_id);

-- Trigger for updated_at
drop trigger if exists disputes_updated_at on public.disputes;
create trigger disputes_updated_at before update on public.disputes
  for each row execute function public.update_updated_at_column();

-- ============================================
-- 10) Create profile on auth signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Check if profile already exists to prevent duplicates
  if not exists (select 1 from public.profiles where id = new.id) then
    insert into public.profiles (id, email, display_name, verification_email)
    values (
      new.id, 
      new.email, 
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 
      coalesce((new.email_confirmed_at is not null), false)
    );
  end if;
  return new;
exception
  when others then
    -- Log error but don't fail the auth signup
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 11) Storage bucket and policies for avatars
-- ============================================
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Drop existing storage policies
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Public can view avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload their own avatar
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    (auth.uid()::text = split_part(name, '/', 1) or
     auth.uid()::text = split_part(name, '/', 2))
  );

-- Users can update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    (auth.uid()::text = split_part(name, '/', 1) or
     auth.uid()::text = split_part(name, '/', 2))
  );

-- Users can delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    (auth.uid()::text = split_part(name, '/', 1) or
     auth.uid()::text = split_part(name, '/', 2))
  );

-- ============================================
-- 12) Helper functions for business logic
-- ============================================

-- Function to update trust score after review
create or replace function public.update_trust_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_rating numeric;
  review_count int;
  new_score int;
begin
  -- Calculate average rating and count for reviewee
  select avg(rating), count(*) 
  into avg_rating, review_count
  from public.reviews
  where reviewee_id = new.reviewee_id;
  
  -- Simple trust score calculation (can be made more sophisticated)
  new_score := least(100, greatest(0, 
    (avg_rating * 20) + -- Max 100 from rating
    least(20, review_count * 2) -- Bonus for number of reviews, max 20
  ));
  
  -- Update profile trust score
  update public.profiles
  set trust_score = new_score
  where id = new.reviewee_id;
  
  return new;
end;
$$;

-- Trigger to update trust score after review
drop trigger if exists update_trust_score_after_review on public.reviews;
create trigger update_trust_score_after_review
  after insert or update or delete on public.reviews
  for each row execute function public.update_trust_score();

-- Function to check and award achievements
create or replace function public.check_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trade_count int;
begin
  -- Only check on trade completion
  if new.status = 'completed' and old.status != 'completed' then
    -- Check first trade achievement for both parties
    if not exists (
      select 1 from public.achievements 
      where user_id = new.proposer_id and key = 'first_trade'
    ) then
      insert into public.achievements (user_id, key, level)
      values (new.proposer_id, 'first_trade', 'bronze')
      on conflict do nothing;
    end if;
    
    if not exists (
      select 1 from public.achievements 
      where user_id = new.provider_id and key = 'first_trade'
    ) then
      insert into public.achievements (user_id, key, level)
      values (new.provider_id, 'first_trade', 'bronze')
      on conflict do nothing;
    end if;
    
    -- Check for loop master (10+ trades)
    select count(*) into trade_count
    from public.trades
    where (proposer_id = new.proposer_id or provider_id = new.proposer_id)
    and status = 'completed';
    
    if trade_count >= 10 and not exists (
      select 1 from public.achievements 
      where user_id = new.proposer_id and key = 'loop_master'
    ) then
      insert into public.achievements (user_id, key, level)
      values (new.proposer_id, 'loop_master', 'silver')
      on conflict do nothing;
    end if;
  end if;
  
  return new;
end;
$$;

-- Trigger to check achievements
drop trigger if exists check_achievements_on_trade on public.trades;
create trigger check_achievements_on_trade
  after update on public.trades
  for each row execute function public.check_achievements();

-- ============================================
-- 13) Indexes for performance optimization
-- ============================================

-- Additional composite indexes for common queries
create index if not exists idx_trades_proposer_status on public.trades(proposer_id, status);
create index if not exists idx_trades_provider_status on public.trades(provider_id, status);
create index if not exists idx_services_user_availability on public.services(user_id, availability);

-- ============================================
-- 14) Grant necessary permissions
-- ============================================

-- Grant usage on schemas
grant usage on schema public to anon, authenticated;

-- Grant permissions on tables
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- Ensure RLS is enabled on all tables
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.trades enable row level security;
alter table public.trade_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.achievements enable row level security;
alter table public.disputes enable row level security;