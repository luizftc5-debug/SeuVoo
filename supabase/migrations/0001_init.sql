-- SeuVoo · esquema inicial (Postgres / Supabase)
-- Espelha src/server/db/schema.ts. Instantes em timestamptz (UTC); datas de viagem em date.
-- Todas as tabelas privadas têm RLS: cada usuário só vê o que é seu.
-- STATUS: preparado, ainda não aplicado nem testado contra um projeto Supabase real
-- (o adapter de repositório Postgres está pendente — ver docs/ARCHITECTURE.md).

create extension if not exists pgcrypto;

-- Perfis (1:1 com auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  preferences jsonb not null default '{"theme":"system","emailAlerts":false}'::jsonb,
  created_at timestamptz not null default now()
);

-- Referência pública
create table public.airports (
  iata char(3) primary key,
  icao char(4) unique,
  name text not null,
  city text,
  state text,
  country text not null,
  timezone text not null,
  lat double precision,
  lon double precision
);

create table public.airlines (
  iata varchar(2) primary key,
  icao char(3) unique,
  name text not null
);

-- Instantâneo normalizado de uma ocorrência de voo (dados operacionais, não pessoais)
create table public.flight_occurrences (
  id text primary key,                         -- "<fonte>:<id do provedor>"
  source text not null check (source in ('demo', 'aeroapi')),
  provider_id text not null,
  designator text not null,
  airline_iata varchar(2),
  flight_number text,
  departure_airport char(3) not null,
  arrival_airport char(3) not null,
  operating_date date,
  scheduled_times jsonb not null default '{}'::jsonb,
  estimated_times jsonb not null default '{}'::jsonb,
  actual_times jsonb not null default '{}'::jsonb,
  status text not null,
  snapshot jsonb not null,                     -- FlightOccurrence completo
  updated_at timestamptz not null default now(),
  unique (source, provider_id)
);
create index flight_occurrences_designator_date on public.flight_occurrences (designator, operating_date);

create table public.tracked_flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flight_occurrence_id text not null references public.flight_occurrences (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  unique (user_id, flight_occurrence_id)
);
create index tracked_flights_occurrence on public.tracked_flights (flight_occurrence_id);

create table public.flight_events (
  id uuid primary key default gen_random_uuid(),
  flight_occurrence_id text not null references public.flight_occurrences (id) on delete cascade,
  event_type text not null,
  previous_value text,
  current_value text,
  occurred_at timestamptz,
  detected_at timestamptz not null default now(),
  dedupe_key text not null unique               -- garante um evento por mudança
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  destination text not null,
  country text,
  start_date date not null,
  end_date date not null,
  description text,
  cover_url text check (cover_url is null or cover_url like 'https://%'),
  participants text[] not null default '{}',
  budget_cents bigint check (budget_cents is null or budget_cents >= 0),
  currency char(3) not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index trips_user_start on public.trips (user_id, start_date);

-- Preparado para viagens compartilhadas (MVP: apenas o dono)
create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  permissions jsonb not null default '{}'::jsonb,
  primary key (trip_id, user_id)
);

create table public.trip_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  segment_type text not null default 'flight' check (segment_type in ('flight')),
  flight_occurrence_id text references public.flight_occurrences (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (trip_id, flight_occurrence_id)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('flight','lodging','food','tour','transport','appointment','reservation')),
  description text,
  location text,
  sort_order int not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time >= start_time)
);
create index itinerary_trip_date on public.itinerary_items (trip_id, date, sort_order);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  category text not null check (category in ('flights','lodging','food','transport','tours','shopping','other')),
  description text not null,
  expected_amount_cents bigint check (expected_amount_cents is null or expected_amount_cents >= 0),
  actual_amount_cents bigint check (actual_amount_cents is null or actual_amount_cents >= 0),
  currency char(3) not null,
  date date,
  created_at timestamptz not null default now(),
  check (expected_amount_cents is not null or actual_amount_cents is not null)
);

create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  category text not null check (category in ('documents','clothing','hygiene','electronics','medicine','other')),
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.travel_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  name text not null,
  category text not null,
  expires_on date,
  notes text,
  private_storage_reference text,               -- caminho no bucket privado "documents"
  file_mime text,
  file_size int check (file_size is null or file_size <= 5242880),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  flight_occurrence_id text references public.flight_occurrences (id) on delete set null,
  event_reference text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_reference)
);
create index notifications_user_created on public.notifications (user_id, created_at desc);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_type text not null check (resource_type in ('flight')),
  resource_id text not null,
  token_hash text not null unique,              -- SHA-256; o token nunca é armazenado
  scope jsonb not null default '{"showGates":true}'::jsonb,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subscription_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  status text not null default 'active' check (status in ('active', 'inactive'))
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.airports enable row level security;
alter table public.airlines enable row level security;
alter table public.flight_occurrences enable row level security;
alter table public.tracked_flights enable row level security;
alter table public.flight_events enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_segments enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.expenses enable row level security;
alter table public.packing_items enable row level security;
alter table public.travel_documents enable row level security;
alter table public.notifications enable row level security;
alter table public.share_links enable row level security;
alter table public.subscription_entitlements enable row level security;

-- Referência: leitura pública
create policy "airports_read" on public.airports for select using (true);
create policy "airlines_read" on public.airlines for select using (true);

-- Dados operacionais: leitura para quem acompanha; escrita apenas pelo servidor (service role)
create policy "occurrences_read_tracked" on public.flight_occurrences for select
  using (exists (select 1 from public.tracked_flights t where t.flight_occurrence_id = id and t.user_id = auth.uid()));
create policy "events_read_tracked" on public.flight_events for select
  using (exists (select 1 from public.tracked_flights t where t.flight_occurrence_id = flight_events.flight_occurrence_id and t.user_id = auth.uid()));

create policy "profiles_own" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tracked_own" on public.tracked_flights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trips_own" on public.trips for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "documents_own" on public.travel_documents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_own_read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "share_links_own" on public.share_links for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "entitlements_own_read" on public.subscription_entitlements for select using (user_id = auth.uid());

-- Filhos da viagem: acesso via dono da viagem
create or replace function public.owns_trip(t uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.trips where id = t and user_id = auth.uid()) $$;

create policy "members_owner" on public.trip_members for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));
create policy "segments_owner" on public.trip_segments for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));
create policy "itinerary_owner" on public.itinerary_items for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));
create policy "expenses_owner" on public.expenses for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));
create policy "packing_owner" on public.packing_items for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));

-- Perfil e plano gratuito criados no cadastro
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
    values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Viajante'));
  insert into public.subscription_entitlements (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bucket privado para documentos (sem URLs públicas; servir com URLs assinadas curtas)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('documents', 'documents', false, 5242880, array['application/pdf','image/png','image/jpeg'])
  on conflict (id) do nothing;

create policy "documents_bucket_own" on storage.objects for all
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
