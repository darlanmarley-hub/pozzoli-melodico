-- =========================================================================
-- POZZOLI MELÓDICO NO BOLSO - SCHEMA SUPABASE (PostgreSQL + RLS)
-- Cole este script no SQL Editor do painel Supabase:
-- https://supabase.com/dashboard/project/ejjemzuvyzmxyjteeonz/sql/new
-- =========================================================================

-- 1. Tabela de Planos (Anual e Vitalício)
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,           -- 'anual' | 'vitalicio'
  titulo text not null,                -- 'Plano Anual' | 'Plano Vitalício'
  duracao_dias integer,                -- 365 para anual, NULL para vitalício
  created_at timestamptz not null default now()
);

alter table public.planos enable row level security;

drop policy if exists "Qualquer usuário lê os planos" on public.planos;
create policy "Qualquer usuário lê os planos"
  on public.planos for select
  to anon, authenticated
  using ( true );

-- Inserir os dois planos padrão (Anual e Vitalício)
insert into public.planos (nome, titulo, duracao_dias)
values
  ('vitalicio', 'Plano Vitalício', null),
  ('anual', 'Plano Anual', 365)
on conflict (nome) do update
set titulo = excluded.titulo,
    duracao_dias = excluded.duracao_dias;

-- 2. Tabela users_plano (idêntica ao modelo das imagens)
create table if not exists public.users_plano (
  id uuid primary key default gen_random_uuid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  plano_id uuid references public.planos(id) on delete set null,
  data_inicio timestamptz,
  data_final timestamptz,
  status text default 'primeiro-acesso'::text
);

create index if not exists idx_users_plano_plano_id on public.users_plano(plano_id);

alter table public.users_plano enable row level security;

drop policy if exists "Usuário lê o próprio plano" on public.users_plano;
create policy "Usuário lê o próprio plano"
  on public.users_plano for select
  to authenticated
  using ( (select auth.uid()) = id );

drop policy if exists "Usuário insere o próprio plano" on public.users_plano;
create policy "Usuário insere o próprio plano"
  on public.users_plano for insert
  to authenticated
  with check ( (select auth.uid()) = id );

drop policy if exists "Usuário atualiza o próprio plano" on public.users_plano;
create policy "Usuário atualiza o próprio plano"
  on public.users_plano for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- Trigger para atualizar updated_at e calcular data_final automaticamente
-- Se o plano for 'anual', data_final = data_inicio + 1 year; se for 'vitalicio', data_final = NULL
create or replace function public.handle_users_plano_dates()
returns trigger
language plpgsql
security invoker set search_path = ''
as $$
declare
  v_nome_plano text;
begin
  new.updated_at := now();

  if new.plano_id is not null then
    select p.nome into v_nome_plano
    from public.planos p
    where p.id = new.plano_id;

    if new.data_inicio is null and new.status = 'ativo' then
      new.data_inicio := now();
    end if;

    if v_nome_plano = 'anual' and new.data_inicio is not null and new.data_final is null then
      new.data_final := new.data_inicio + interval '1 year';
    elsif v_nome_plano = 'vitalicio' then
      new.data_final := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_plano_dates on public.users_plano;
create trigger trg_users_plano_dates
  before insert or update on public.users_plano
  for each row execute procedure public.handle_users_plano_dates();

-- 3. Tabela de Perfis e Progresso do Aluno
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text default 'Estudante de Música',
  instrument text default 'Voz / Solfejo',
  avatar text default '🎵',
  photo_url text,
  plan text default 'vitalicio',
  daily_goal_minutes integer default 15,
  streak_days integer default 1,
  last_practice_date date default current_date,
  favorites text[] default '{}',
  studied text[] default '{}',
  custom_series jsonb default '[]'::jsonb,
  stats jsonb default '{"totalPracticeMinutes": 0, "totalSessions": 0, "weeklyPractice": [0,0,0,0,0,0,0], "history": []}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Usuários leem o próprio perfil" on public.profiles;
create policy "Usuários leem o próprio perfil"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

drop policy if exists "Usuários criam o próprio perfil" on public.profiles;
create policy "Usuários criam o próprio perfil"
  on public.profiles for insert
  to authenticated
  with check ( (select auth.uid()) = id );

drop policy if exists "Usuários atualizam o próprio perfil" on public.profiles;
create policy "Usuários atualizam o próprio perfil"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- 4. Trigger para criar profile + users_plano automaticamente no cadastro do usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plano_nome text;
  v_plano_id uuid;
begin
  v_plano_nome := coalesce(new.raw_user_meta_data->>'plan', 'vitalicio');

  select id into v_plano_id
  from public.planos
  where nome = v_plano_nome
  limit 1;

  insert into public.profiles (id, email, name, photo_url, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    v_plano_nome
  )
  on conflict (id) do nothing;

  insert into public.users_plano (id, plano_id, data_inicio, data_final, status)
  values (
    new.id,
    v_plano_id,
    now(),
    case when v_plano_nome = 'anual' then now() + interval '1 year' else null end,
    'primeiro-acesso'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Tabela de Compras Autorizadas e Logs do Webhook SyncPay
create table if not exists public.authorized_purchases (
  id bigint generated always as identity primary key,
  email text unique not null,
  plan text default 'vitalicio',
  transaction_code text default 'SYNCPAY',
  created_at timestamptz default now()
);

alter table public.authorized_purchases enable row level security;

create index if not exists idx_authorized_purchases_email
  on public.authorized_purchases (lower(email));

drop policy if exists "Usuário autenticado lê a própria compra" on public.authorized_purchases;
create policy "Usuário autenticado lê a própria compra"
  on public.authorized_purchases for select
  to authenticated
  using ( lower(email) = lower((select auth.jwt() ->> 'email')) );

create table if not exists public.webhook_raw_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'syncpay',
  event_type text,
  transaction_id text,
  email text,
  status text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.webhook_raw_events enable row level security;
create index if not exists idx_webhook_raw_events_email on public.webhook_raw_events(lower(email));

