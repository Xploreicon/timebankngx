-- Enable needed extensions
create extension if not exists pgcrypto;

-- Utility function to auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles table mirrors business user data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  phone text,
  email text,
  password_hash text,
  category text check (category in ('Legal','Tech','Creative','Fashion','Food','Professional','Logistics','Education')),
  location text,
  address text,
  time_credits numeric not null default 0,
  trust_score numeric not null default 4.5,
  level int not null default 1,
  xp int not null default 0,
  verification_status jsonb not null default jsonb_build_object('phone', false, 'email', false, 'cac', false),
  avatar_url text,
  bio text,
  social_links jsonb not null default jsonb_build_object('whatsapp','', 'instagram','', 'twitter',''),
  joined_date timestamptz not null default now(),
  last_active timestamptz not null default now(),
  completed_trades int not null default 0,
  success_rate numeric not null default 0,
  response_time text default '—',
  badges text[] not null default '{}',
  preferences jsonb not null default jsonb_build_object('notifications', true, 'language', 'en', 'theme','system'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Basic policies for profiles
create policy if not exists "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy if not exists "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy if not exists "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Trigger to update updated_at
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Function and trigger to insert profile on new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, business_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'business_name',''));
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'skill_level_enum') then
    create type skill_level_enum as enum ('Beginner','Intermediate','Expert');
  end if;
  if not exists (select 1 from pg_type where typname = 'trade_status_enum') then
    create type trade_status_enum as enum ('pending','negotiating','accepted','active','completed','disputed','cancelled');
  end if;
end $$;

-- Services table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  subcategory text,
  hourly_rate numeric not null default 0,
  minimum_hours numeric not null default 1,
  maximum_hours numeric not null default 8,
  availability boolean not null default true,
  skill_level skill_level_enum not null default 'Intermediate',
  portfolio text[] not null default '{}',
  tags text[] not null default '{}',
  views int not null default 0,
  inquiries int not null default 0,
  completed_count int not null default 0,
  rating numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create index if not exists idx_services_user on public.services(user_id);
create index if not exists idx_services_category on public.services(category);

create policy if not exists "Services are public readable"
  on public.services for select using (true);

create policy if not exists "Users can manage own services"
  on public.services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger services_updated_at before update on public.services
for each row execute function public.update_updated_at_column();

-- Trades table
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.profiles(id) on delete restrict,
  service_offered_id uuid not null references public.services(id) on delete restrict,
  service_requested_id uuid not null references public.services(id) on delete restrict,
  hours_offered numeric not null,
  hours_requested numeric not null,
  exchange_rate numeric not null default 1,
  status trade_status_enum not null default 'pending',
  terms text default '',
  delivery_date timestamptz,
  escrow_credits numeric not null default 0,
  rating_proposer int,
  rating_provider int,
  review_proposer text,
  review_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.trades enable row level security;

create index if not exists idx_trades_proposer on public.trades(proposer_id);
create index if not exists idx_trades_provider on public.trades(provider_id);

create policy if not exists "Trades visible to participants"
  on public.trades for select using (auth.uid() = proposer_id or auth.uid() = provider_id);

create policy if not exists "Create trades as proposer"
  on public.trades for insert with check (auth.uid() = proposer_id);

create policy if not exists "Participants can update trades"
  on public.trades for update using (auth.uid() = proposer_id or auth.uid() = provider_id);

create trigger trades_updated_at before update on public.trades
for each row execute function public.update_updated_at_column();

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  timestamp timestamptz not null default now(),
  read boolean not null default false,
  attachments text[] not null default '{}'
);

alter table public.messages enable row level security;

create index if not exists idx_messages_trade on public.messages(trade_id);

create policy if not exists "Messages visible to participants"
  on public.messages for select using (
    exists (
      select 1 from public.trades t 
      where t.id = trade_id and (auth.uid() = t.proposer_id or auth.uid() = t.provider_id)
    )
  );

create policy if not exists "Participants can send messages"
  on public.messages for insert with check (
    exists (
      select 1 from public.trades t 
      where t.id = trade_id and auth.uid() in (t.proposer_id, t.provider_id)
    ) and auth.uid() = sender_id
  );

-- Achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  name text not null,
  level text not null,
  unlocked_at timestamptz not null default now()
);

alter table public.achievements enable row level security;
create index if not exists idx_achievements_user on public.achievements(user_id);

create policy if not exists "Achievements readable by owner or public badges"
  on public.achievements for select using (true);

create policy if not exists "Users manage own achievements"
  on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

alter table public.notifications enable row level security;
create index if not exists idx_notifications_user on public.notifications(user_id);

create policy if not exists "Users read own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy if not exists "Users manage own notifications"
  on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Disputes
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  issue text not null,
  evidence_urls text[] not null default '{}',
  status text not null default 'open',
  mediator_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.disputes enable row level security;
create policy if not exists "Disputes for participants"
  on public.disputes for select using (
    exists (select 1 from public.trades t where t.id = trade_id and auth.uid() in (t.proposer_id, t.provider_id))
  );
create policy if not exists "Participants can create disputes"
  on public.disputes for insert with check (
    exists (select 1 from public.trades t where t.id = trade_id and auth.uid() in (t.proposer_id, t.provider_id)) and auth.uid() = user_id
  );
create policy if not exists "Participants can update disputes"
  on public.disputes for update using (
    exists (select 1 from public.trades t where t.id = trade_id and auth.uid() in (t.proposer_id, t.provider_id))
  );

create trigger disputes_updated_at before update on public.disputes
for each row execute function public.update_updated_at_column();

-- FAQs (public)
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table public.faqs enable row level security;
create policy if not exists "FAQs are public"
  on public.faqs for select using (true);

-- Referrals
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  referral_user_id uuid,
  bonus_credits numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;
create policy if not exists "Users read own referrals"
  on public.referrals for select using (auth.uid() = user_id);
create policy if not exists "Users create referrals"
  on public.referrals for insert with check (auth.uid() = user_id);

-- Realtime setup
alter table public.trades replica identity full;
alter table public.messages replica identity full;
alter table public.services replica identity full;
alter table public.notifications replica identity full;
alter table public.disputes replica identity full;

-- Add to realtime publication
begin;
  -- ignore errors if already present
  do $$ begin
    perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='trades';
    if not found then
      execute 'alter publication supabase_realtime add table public.trades';
    end if;
  end $$;
  do $$ begin
    perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='messages';
    if not found then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
  end $$;
  do $$ begin
    perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='services';
    if not found then
      execute 'alter publication supabase_realtime add table public.services';
    end if;
  end $$;
  do $$ begin
    perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname='public' and tablename='notifications';
    if not found then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;
  end $$;
commit;

-- Storage buckets for avatars, portfolios, disputes evidence
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('portfolio','portfolio', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('evidence','evidence', false)
  on conflict (id) do nothing;

-- Storage policies
create policy if not exists "Public can view avatars"
  on storage.objects for select using (bucket_id = 'avatars');
create policy if not exists "Users can upload/update own avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy if not exists "Users can update own avatar"
  on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Public can view portfolio"
  on storage.objects for select using (bucket_id = 'portfolio');
create policy if not exists "Users can upload to portfolio"
  on storage.objects for insert with check (bucket_id = 'portfolio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy if not exists "Users can update portfolio"
  on storage.objects for update using (bucket_id = 'portfolio' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Evidence private to owner"
  on storage.objects for select using (bucket_id = 'evidence' and auth.uid()::text = (storage.foldername(name))[1]);
create policy if not exists "Users can upload evidence"
  on storage.objects for insert with check (bucket_id = 'evidence' and auth.uid()::text = (storage.foldername(name))[1]);
create policy if not exists "Users can update evidence"
  on storage.objects for update using (bucket_id = 'evidence' and auth.uid()::text = (storage.foldername(name))[1]);
