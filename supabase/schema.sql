-- ==============================================================================
-- Career OS - Complete Supabase Database Schema & Row Level Security (RLS)
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- to initialize or recreate the complete schema with full RLS policy protection.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Resumes
-- ------------------------------------------------------------------------------
create table if not exists public.resumes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    raw_text text not null,
    parsed_skills text[] default '{}'::text[] not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_resumes_created_at on public.resumes(created_at desc);

alter table public.resumes enable row level security;

create policy "Users can view their own resumes"
    on public.resumes for select
    using (auth.uid() = user_id);

create policy "Users can insert their own resumes"
    on public.resumes for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own resumes"
    on public.resumes for update
    using (auth.uid() = user_id);

create policy "Users can delete their own resumes"
    on public.resumes for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. Job Descriptions
-- ------------------------------------------------------------------------------
create table if not exists public.job_descriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    raw_text text not null,
    parsed_requirements text[] default '{}'::text[] not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_jd_user_id on public.job_descriptions(user_id);
create index if not exists idx_jd_created_at on public.job_descriptions(created_at desc);

alter table public.job_descriptions enable row level security;

create policy "Users can view their own job descriptions"
    on public.job_descriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own job descriptions"
    on public.job_descriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own job descriptions"
    on public.job_descriptions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own job descriptions"
    on public.job_descriptions for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. Matches
-- ------------------------------------------------------------------------------
create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    resume_id uuid references public.resumes(id) on delete cascade not null,
    jd_id uuid references public.job_descriptions(id) on delete cascade not null,
    match_score numeric(5,2) not null,
    missing_keywords text[] default '{}'::text[] not null,
    suggestions text[] default '{}'::text[] not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_matches_user_id on public.matches(user_id);
create index if not exists idx_matches_resume_id on public.matches(resume_id);
create index if not exists idx_matches_jd_id on public.matches(jd_id);
create index if not exists idx_matches_created_at on public.matches(created_at desc);

alter table public.matches enable row level security;

create policy "Users can view their own matches"
    on public.matches for select
    using (auth.uid() = user_id);

create policy "Users can insert their own matches"
    on public.matches for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own matches"
    on public.matches for update
    using (auth.uid() = user_id);

create policy "Users can delete their own matches"
    on public.matches for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Interview Sessions
-- ------------------------------------------------------------------------------
create table if not exists public.interview_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    jd_id uuid references public.job_descriptions(id) on delete set null,
    transcript jsonb default '[]'::jsonb not null,
    feedback jsonb default null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_interviews_user_id on public.interview_sessions(user_id);
create index if not exists idx_interviews_created_at on public.interview_sessions(created_at desc);

alter table public.interview_sessions enable row level security;

create policy "Users can view their own interview sessions"
    on public.interview_sessions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own interview sessions"
    on public.interview_sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own interview sessions"
    on public.interview_sessions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own interview sessions"
    on public.interview_sessions for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Applications (Kanban)
-- ------------------------------------------------------------------------------
create table if not exists public.applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    company text not null,
    role text not null,
    stage text not null check (stage in ('applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn')),
    deadline date,
    notes text,
    salary text,
    location text,
    url text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_applications_user_id on public.applications(user_id);
create index if not exists idx_applications_stage on public.applications(stage);
create index if not exists idx_applications_created_at on public.applications(created_at desc);

alter table public.applications enable row level security;

create policy "Users can view their own applications"
    on public.applications for select
    using (auth.uid() = user_id);

create policy "Users can insert their own applications"
    on public.applications for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own applications"
    on public.applications for update
    using (auth.uid() = user_id);

create policy "Users can delete their own applications"
    on public.applications for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Peer Profiles (Phase 4 Peer Matchmaking)
-- ------------------------------------------------------------------------------
create table if not exists public.peer_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    target_role text not null,
    target_company text default '',
    skills text[] default '{}'::text[] not null,
    experience_level text default 'Mid-Level',
    availability text default 'Flexible',
    bio text default '',
    contact_email text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_peer_profiles_user_id on public.peer_profiles(user_id);

alter table public.peer_profiles enable row level security;

create policy "Authenticated users can view peer profiles"
    on public.peer_profiles for select
    using (auth.uid() is not null);

create policy "Users can insert their own peer profile"
    on public.peer_profiles for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own peer profile"
    on public.peer_profiles for update
    using (auth.uid() = user_id);

create policy "Users can delete their own peer profile"
    on public.peer_profiles for delete
    using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. Peer Connection Requests
-- ------------------------------------------------------------------------------
create table if not exists public.peer_requests (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid references auth.users(id) on delete cascade not null,
    receiver_id uuid references auth.users(id) on delete cascade not null,
    status text not null check (status in ('pending', 'accepted', 'declined')) default 'pending',
    message text default '',
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_peer_requests_sender on public.peer_requests(sender_id);
create index if not exists idx_peer_requests_receiver on public.peer_requests(receiver_id);

alter table public.peer_requests enable row level security;

create policy "Users can view requests they sent or received"
    on public.peer_requests for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert connection requests"
    on public.peer_requests for insert
    with check (auth.uid() = sender_id);

create policy "Receivers can update request status"
    on public.peer_requests for update
    using (auth.uid() = receiver_id or auth.uid() = sender_id);

