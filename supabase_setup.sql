-- Kyvello / AI creator studio — Supabase schema aligned with this repo
-- Run in: Supabase Dashboard → SQL Editor
-- Prerequisites: Auth enabled (auth.users). gen_random_uuid() is available by default.

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  credits integer not null default 0,
  plan text not null default 'free',
  zernio_profile_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default (now() at time zone 'utc')
);

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  gender text,
  body_type text,
  skin_tone text,
  age_range text,
  hair_style_color text,
  vibe_aesthetic text,
  prompt text,
  portrait_image_url text,
  full_body_image_url text,
  created_at timestamptz not null default (now() at time zone 'utc')
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  model_id uuid references public.models (id) on delete set null,
  image_url text not null,
  platform text not null,
  caption text,
  status text default 'draft',
  scheduled_at timestamptz,
  post_format text,
  created_at timestamptz not null default (now() at time zone 'utc')
);

alter table public.posts add column if not exists post_format text;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  zernio_account_id text not null,
  account_name text,
  account_image text,
  created_at timestamptz not null default (now() at time zone 'utc'),
  constraint social_accounts_zernio_account_id_key unique (zernio_account_id)
);

-- ---------------------------------------------------------------------------
-- INDEXES (FK / common filters)
-- ---------------------------------------------------------------------------

create index if not exists models_user_id_idx on public.models (user_id);
create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists posts_status_scheduled_at_idx on public.posts (user_id, status, scheduled_at);
create index if not exists social_accounts_user_id_idx on public.social_accounts (user_id);
create index if not exists profiles_stripe_subscription_id_idx on public.profiles (stripe_subscription_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.models enable row level security;
alter table public.posts enable row level security;
alter table public.social_accounts enable row level security;

-- profiles
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- models
drop policy if exists "Users can view their own models" on public.models;
create policy "Users can view their own models"
  on public.models for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own models" on public.models;
create policy "Users can insert their own models"
  on public.models for insert to authenticated
  with check (auth.uid() = user_id);

-- posts
drop policy if exists "Users can view their own posts" on public.posts;
create policy "Users can view their own posts"
  on public.posts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- social_accounts
drop policy if exists "Users can view their own social accounts" on public.social_accounts;
create policy "Users can view their own social accounts"
  on public.social_accounts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own social accounts" on public.social_accounts;
create policy "Users can delete their own social accounts"
  on public.social_accounts for delete to authenticated
  using (auth.uid() = user_id);

-- Server actions often use the service role (bypasses RLS). RLS still protects anon/key misuse.

-- ---------------------------------------------------------------------------
-- STORAGE (buckets + policies) — used by lib/actions/luma.ts and posts.ts
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('influencers', 'influencers', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Allow authenticated uploads" on storage.objects;
create policy "Allow authenticated uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'influencers');

drop policy if exists "Allow public read influencers" on storage.objects;
create policy "Allow public read influencers"
  on storage.objects for select to public
  using (bucket_id = 'influencers');

drop policy if exists "Allow authenticated uploads to posts" on storage.objects;
create policy "Allow authenticated uploads to posts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'posts');

drop policy if exists "Allow public read from posts" on storage.objects;
create policy "Allow public read from posts"
  on storage.objects for select to public
  using (bucket_id = 'posts');

-- Upsert/replace uploads need update (and select) in addition to insert
drop policy if exists "Allow authenticated select influencers objects" on storage.objects;
create policy "Allow authenticated select influencers objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'influencers');

drop policy if exists "Allow authenticated update influencers objects" on storage.objects;
create policy "Allow authenticated update influencers objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'influencers')
  with check (bucket_id = 'influencers');

drop policy if exists "Allow authenticated select posts objects" on storage.objects;
create policy "Allow authenticated select posts objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'posts');

drop policy if exists "Allow authenticated update posts objects" on storage.objects;
create policy "Allow authenticated update posts objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'posts')
  with check (bucket_id = 'posts');

-- ---------------------------------------------------------------------------
-- If you already created `profiles` from an older template (missing columns):
-- alter table public.profiles add column if not exists credits integer not null default 0;
-- alter table public.profiles add column if not exists plan text not null default 'free';
-- alter table public.profiles add column if not exists zernio_profile_id text;
-- alter table public.profiles add column if not exists stripe_customer_id text;
-- alter table public.profiles add column if not exists stripe_subscription_id text;
-- ---------------------------------------------------------------------------
