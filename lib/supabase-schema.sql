-- ==========================================================
-- Electrodrivers SaaS Portal - Supabase / PostgreSQL Schema
-- ==========================================================

-- 1. Create Enums for Roles and Statuses
create type user_role as enum ('user', 'admin', 'superadmin');
create type user_status as enum ('pending', 'active', 'blocked');

-- 2. Create Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  telegram_nickname text not null,
  role user_role not null default 'user',
  status user_status not null default 'pending',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Spaces (Knowledge Base categories / workspaces)
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text default 'BookOpen',
  color text default '#00f0ff',
  display_order int default 0,
  created_at timestamptz not null default now()
);

-- 4. Articles (Confluence / Wiki hierarchy)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade not null,
  parent_id uuid references public.articles(id) on delete set null,
  title text not null,
  slug text not null,
  content text not null,
  excerpt text,
  tags text[] default array[]::text[],
  is_pinned boolean default false,
  views_count int default 0,
  read_time_minutes int default 3,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id text,
  target_type text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 6. Trigger: Automatically insert profile on Supabase auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, telegram_nickname, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'telegram_nickname', '@driver'),
    'user',
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Row Level Security (RLS) Configuration
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.articles enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles Policies
-- Individual can read their own profile
create policy "Individual Read Own Profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins and SuperAdmins can read all profiles
create policy "Admins Read All Profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin') and status = 'active'
    )
  );

-- Only SuperAdmin can update profile role and status
create policy "SuperAdmin Update Profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin' and status = 'active'
    )
  );

-- Spaces Policies: Read for active users, write for admin/superadmin
create policy "Active Users Read Spaces"
  on public.spaces for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

create policy "Admins Manage Spaces"
  on public.spaces for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin') and status = 'active'
    )
  );

-- Articles Policies: Read for active users, CRUD for admin/superadmin
create policy "Active Users Read Articles"
  on public.articles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

create policy "Admins Insert Articles"
  on public.articles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin') and status = 'active'
    )
  );

create policy "Admins Update Articles"
  on public.articles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin') and status = 'active'
    )
  );

create policy "Admins Delete Articles"
  on public.articles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin') and status = 'active'
    )
  );

-- Audit Logs Policies: SuperAdmin view
create policy "SuperAdmin View Audit Logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin' and status = 'active'
    )
  );
