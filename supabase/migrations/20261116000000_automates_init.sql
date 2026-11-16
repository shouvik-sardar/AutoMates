-- =====================================================================
-- AutoMates — database setup (prototype)
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once.
-- =====================================================================

-- ---------- Settings: group thresholds (change here, no app update) ----
create table if not exists public.app_settings (
  key   text primary key,
  value int  not null,
  label text
);

insert into public.app_settings (key, value, label) values
  ('min_group_size', 5,  'Buyers needed to start negotiating with dealers'),
  ('best_group_size', 10, 'Buyers needed for the best possible deal')
on conflict (key) do nothing;

-- ---------- Cities ----------------------------------------------------
create table if not exists public.cities (
  id     text primary key,
  name   text not null,
  sort   int  not null default 100,
  active boolean not null default true
);

insert into public.cities (id, name, sort) values
  ('chennai',   'Chennai',   1),
  ('bengaluru', 'Bengaluru', 2)
on conflict (id) do nothing;

-- ---------- Brands & models catalogue ----------------------------------
create table if not exists public.brands (
  id      text primary key,
  name    text not null,
  segment text not null check (segment in ('mass','premium','luxury')),
  color   text not null default '#334155',
  sort    int  not null default 100,
  active  boolean not null default true
);

create table if not exists public.models (
  id        bigint generated always as identity primary key,
  brand_id  text not null references public.brands(id) on delete cascade,
  name      text not null,
  body_type text,
  active    boolean not null default true,
  unique (brand_id, name)
);

-- ---------- User profiles ---------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  city_id    text references public.cities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Interests (a user joining a brand group in a city) ---------
create table if not exists public.interests (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brand_id           text not null references public.brands(id),
  city_id            text not null references public.cities(id),
  preferred_model_id bigint references public.models(id) on delete set null,
  timeline           text not null default '1_3_months'
                     check (timeline in ('this_month','1_3_months','3_6_months')),
  created_at         timestamptz not null default now(),
  unique (user_id, brand_id, city_id)
);

-- ---------- Public live counters per brand + city ----------------------
-- Only counts are public; who is interested stays private.
create table if not exists public.group_counts (
  brand_id   text not null references public.brands(id) on delete cascade,
  city_id    text not null references public.cities(id) on delete cascade,
  interested int  not null default 0,
  status     text not null default 'forming'
             check (status in ('forming','ready','negotiating','deal_live','closed')),
  deal_note  text,
  updated_at timestamptz not null default now(),
  primary key (brand_id, city_id)
);

-- ---------- Keep counters in sync automatically ------------------------
create or replace function public.refresh_group_count(p_brand text, p_city text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n        int;
  min_size int;
begin
  select count(*) into n from public.interests
   where brand_id = p_brand and city_id = p_city;
  select value into min_size from public.app_settings where key = 'min_group_size';

  insert into public.group_counts (brand_id, city_id, interested, status, updated_at)
  values (p_brand, p_city, n,
          case when n >= coalesce(min_size, 5) then 'ready' else 'forming' end,
          now())
  on conflict (brand_id, city_id) do update
     set interested = excluded.interested,
         -- automatic status only while forming/ready; once you (admin) set
         -- negotiating / deal_live / closed, it is left alone
         status = case when public.group_counts.status in ('forming','ready')
                       then excluded.status
                       else public.group_counts.status end,
         updated_at = now();
end;
$$;

create or replace function public.on_interest_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    perform public.refresh_group_count(new.brand_id, new.city_id);
  end if;
  if tg_op in ('DELETE','UPDATE') then
    perform public.refresh_group_count(old.brand_id, old.city_id);
  end if;
  return null;
end;
$$;

drop trigger if exists interests_count_sync on public.interests;
create trigger interests_count_sync
after insert or update or delete on public.interests
for each row execute function public.on_interest_change();

revoke execute on function public.refresh_group_count(text, text) from public, anon, authenticated;
revoke execute on function public.on_interest_change() from public, anon, authenticated;

-- ---------- Auto-create a profile when someone signs up ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- Security (Row Level Security) ------------------------------
alter table public.app_settings enable row level security;
alter table public.cities       enable row level security;
alter table public.brands       enable row level security;
alter table public.models       enable row level security;
alter table public.profiles     enable row level security;
alter table public.interests    enable row level security;
alter table public.group_counts enable row level security;

-- Explicit grants (newer Supabase projects do not auto-expose tables)
grant usage on schema public to anon, authenticated;
revoke all on public.app_settings, public.cities, public.brands, public.models,
              public.group_counts, public.profiles, public.interests
  from anon, authenticated;
grant select on public.app_settings, public.cities, public.brands, public.models,
                public.group_counts
  to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.interests to authenticated;
grant update (preferred_model_id, timeline) on public.interests to authenticated;

-- Public read-only catalogue and counters
drop policy if exists "read settings" on public.app_settings;
create policy "read settings" on public.app_settings for select using (true);
drop policy if exists "read cities" on public.cities;
create policy "read cities" on public.cities for select using (true);
drop policy if exists "read brands" on public.brands;
create policy "read brands" on public.brands for select using (true);
drop policy if exists "read models" on public.models;
create policy "read models" on public.models for select using (true);
drop policy if exists "read counts" on public.group_counts;
create policy "read counts" on public.group_counts for select using (true);

-- Profiles: only your own
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Interests: only your own
drop policy if exists "own interests read" on public.interests;
create policy "own interests read" on public.interests for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "own interests insert" on public.interests;
create policy "own interests insert" on public.interests for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "own interests update" on public.interests;
create policy "own interests update" on public.interests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own interests delete" on public.interests;
create policy "own interests delete" on public.interests for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Live updates to the app -----------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_counts'
  ) then
    alter publication supabase_realtime add table public.group_counts;
  end if;
end $$;

-- ---------- Founder view: who joined which group (NOT exposed to the app)
create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

create or replace view admin.leads as
select i.created_at,
       c.name  as city,
       b.name  as brand,
       m.name  as preferred_model,
       i.timeline,
       p.full_name,
       p.phone,
       u.email
  from public.interests i
  join public.brands b   on b.id = i.brand_id
  join public.cities c   on c.id = i.city_id
  left join public.models m   on m.id = i.preferred_model_id
  left join public.profiles p on p.id = i.user_id
  left join auth.users u      on u.id = i.user_id
 order by i.created_at desc;

-- =====================================================================
-- Catalogue data (Indian market, 2026). Edit freely in Table Editor.
-- =====================================================================
insert into public.brands (id, name, segment, color, sort) values
  ('maruti',     'Maruti Suzuki', 'mass',    '#1E3A8A', 1),
  ('tata',       'Tata Motors',   'mass',    '#0F4C81', 2),
  ('hyundai',    'Hyundai',       'mass',    '#002C5F', 3),
  ('mahindra',   'Mahindra',      'mass',    '#C8102E', 4),
  ('kia',        'Kia',           'mass',    '#05141F', 5),
  ('toyota',     'Toyota',        'mass',    '#EB0A1E', 6),
  ('honda',      'Honda',         'mass',    '#CC0000', 7),
  ('mg',         'MG Motor',      'mass',    '#8B1E2D', 8),
  ('skoda',      'Skoda',         'mass',    '#0E3A2F', 9),
  ('volkswagen', 'Volkswagen',    'mass',    '#001E50', 10),
  ('renault',    'Renault',       'mass',    '#B8860B', 11),
  ('nissan',     'Nissan',        'mass',    '#555555', 12),
  ('citroen',    'Citroën',       'mass',    '#7A1F3D', 13),
  ('jeep',       'Jeep',          'premium', '#3B4A2F', 14),
  ('byd',        'BYD',           'premium', '#2B6CB0', 15),
  ('isuzu',      'Isuzu',         'premium', '#9B1C1C', 16),
  ('force',      'Force Motors',  'mass',    '#374151', 17),
  ('vinfast',    'VinFast',       'premium', '#1D4ED8', 18),
  ('bmw',        'BMW',           'luxury',  '#1C69D4', 19),
  ('mercedes',   'Mercedes-Benz', 'luxury',  '#111827', 20),
  ('audi',       'Audi',          'luxury',  '#4B5563', 21),
  ('volvo',      'Volvo',         'luxury',  '#1F2937', 22),
  ('landrover',  'Land Rover',    'luxury',  '#005A2B', 23),
  ('lexus',      'Lexus',         'luxury',  '#1A1A1A', 24),
  ('tesla',      'Tesla',         'luxury',  '#B91C1C', 25)
on conflict (id) do nothing;

insert into public.models (brand_id, name, body_type) values
  -- Maruti Suzuki
  ('maruti','Alto K10','Hatchback'),('maruti','S-Presso','Hatchback'),('maruti','Celerio','Hatchback'),
  ('maruti','Wagon R','Hatchback'),('maruti','Swift','Hatchback'),('maruti','Ignis','Hatchback'),
  ('maruti','Baleno','Hatchback'),('maruti','Dzire','Sedan'),('maruti','Fronx','SUV'),
  ('maruti','Brezza','SUV'),('maruti','Grand Vitara','SUV'),('maruti','Victoris','SUV'),
  ('maruti','Jimny','SUV'),('maruti','e Vitara','Electric SUV'),('maruti','Ertiga','MPV'),
  ('maruti','XL6','MPV'),('maruti','Invicto','MPV'),('maruti','Eeco','Van'),
  -- Tata
  ('tata','Tiago','Hatchback'),('tata','Tiago EV','Electric hatchback'),('tata','Tigor','Sedan'),
  ('tata','Altroz','Hatchback'),('tata','Punch','SUV'),('tata','Punch EV','Electric SUV'),
  ('tata','Nexon','SUV'),('tata','Nexon EV','Electric SUV'),('tata','Curvv','SUV'),
  ('tata','Curvv EV','Electric SUV'),('tata','Harrier','SUV'),('tata','Harrier EV','Electric SUV'),
  ('tata','Safari','SUV'),('tata','Sierra','SUV'),
  -- Hyundai
  ('hyundai','Grand i10 Nios','Hatchback'),('hyundai','i20','Hatchback'),('hyundai','Aura','Sedan'),
  ('hyundai','Exter','SUV'),('hyundai','Venue','SUV'),('hyundai','Verna','Sedan'),
  ('hyundai','Creta','SUV'),('hyundai','Creta Electric','Electric SUV'),('hyundai','Alcazar','SUV'),
  ('hyundai','Tucson','SUV'),('hyundai','Ioniq 5','Electric SUV'),
  -- Mahindra
  ('mahindra','Bolero','SUV'),('mahindra','Bolero Neo','SUV'),('mahindra','Thar','SUV'),
  ('mahindra','Thar Roxx','SUV'),('mahindra','XUV 3XO','SUV'),('mahindra','Scorpio Classic','SUV'),
  ('mahindra','Scorpio N','SUV'),('mahindra','XUV 7XO','SUV'),('mahindra','BE 6','Electric SUV'),
  ('mahindra','XEV 9e','Electric SUV'),('mahindra','XEV 9S','Electric SUV'),
  -- Kia
  ('kia','Sonet','SUV'),('kia','Syros','SUV'),('kia','Seltos','SUV'),('kia','Carens Clavis','MPV'),
  ('kia','Carens Clavis EV','Electric MPV'),('kia','Carnival','MPV'),('kia','EV6','Electric SUV'),
  ('kia','EV9','Electric SUV'),
  -- Toyota
  ('toyota','Glanza','Hatchback'),('toyota','Urban Cruiser Taisor','SUV'),('toyota','Rumion','MPV'),
  ('toyota','Urban Cruiser Hyryder','SUV'),('toyota','Innova Crysta','MPV'),('toyota','Innova Hycross','MPV'),
  ('toyota','Fortuner','SUV'),('toyota','Hilux','Pickup'),('toyota','Camry','Sedan'),
  ('toyota','Vellfire','MPV'),('toyota','Land Cruiser 300','SUV'),
  -- Honda
  ('honda','Amaze','Sedan'),('honda','City','Sedan'),('honda','City e:HEV','Hybrid sedan'),
  ('honda','Elevate','SUV'),
  -- MG
  ('mg','Comet EV','Electric hatchback'),('mg','Windsor EV','Electric crossover'),('mg','Astor','SUV'),
  ('mg','Hector','SUV'),('mg','Hector Plus','SUV'),('mg','ZS EV','Electric SUV'),
  ('mg','Gloster','SUV'),('mg','M9','Electric MPV'),('mg','Cyberster','Electric roadster'),
  -- Skoda
  ('skoda','Kylaq','SUV'),('skoda','Kushaq','SUV'),('skoda','Slavia','Sedan'),
  ('skoda','Kodiaq','SUV'),('skoda','Octavia RS','Sedan'),
  -- Volkswagen
  ('volkswagen','Virtus','Sedan'),('volkswagen','Taigun','SUV'),('volkswagen','Tiguan R-Line','SUV'),
  ('volkswagen','Golf GTI','Hatchback'),
  -- Renault
  ('renault','Kwid','Hatchback'),('renault','Triber','MPV'),('renault','Kiger','SUV'),
  ('renault','Duster','SUV'),
  -- Nissan
  ('nissan','Magnite','SUV'),('nissan','X-Trail','SUV'),
  -- Citroën
  ('citroen','C3','Hatchback'),('citroen','eC3','Electric hatchback'),('citroen','Basalt','SUV coupe'),
  ('citroen','Aircross','SUV'),
  -- Jeep
  ('jeep','Compass','SUV'),('jeep','Meridian','SUV'),('jeep','Wrangler','SUV'),
  ('jeep','Grand Cherokee','SUV'),
  -- BYD
  ('byd','Atto 3','Electric SUV'),('byd','eMAX 7','Electric MPV'),('byd','Seal','Electric sedan'),
  ('byd','Sealion 7','Electric SUV'),
  -- Isuzu
  ('isuzu','D-Max V-Cross','Pickup'),('isuzu','MU-X','SUV'),
  -- Force
  ('force','Gurkha','SUV'),('force','Gurkha 5-door','SUV'),
  -- VinFast
  ('vinfast','VF 6','Electric SUV'),('vinfast','VF 7','Electric SUV'),
  -- BMW
  ('bmw','2 Series Gran Coupe','Sedan'),('bmw','3 Series LWB','Sedan'),('bmw','5 Series LWB','Sedan'),
  ('bmw','7 Series','Sedan'),('bmw','X1','SUV'),('bmw','X3','SUV'),('bmw','X5','SUV'),
  ('bmw','X7','SUV'),('bmw','iX1 LWB','Electric SUV'),('bmw','i4','Electric sedan'),
  ('bmw','iX','Electric SUV'),('bmw','i7','Electric sedan'),
  -- Mercedes-Benz
  ('mercedes','A-Class Limousine','Sedan'),('mercedes','C-Class','Sedan'),('mercedes','E-Class LWB','Sedan'),
  ('mercedes','S-Class','Sedan'),('mercedes','GLA','SUV'),('mercedes','GLC','SUV'),
  ('mercedes','GLE','SUV'),('mercedes','GLS','SUV'),('mercedes','EQA','Electric SUV'),
  ('mercedes','EQB','Electric SUV'),('mercedes','EQS SUV','Electric SUV'),('mercedes','G-Class','SUV'),
  -- Audi
  ('audi','A4','Sedan'),('audi','A6','Sedan'),('audi','Q3','SUV'),('audi','Q5','SUV'),
  ('audi','Q7','SUV'),('audi','Q8','SUV'),('audi','e-tron GT','Electric sedan'),
  -- Volvo
  ('volvo','EX30','Electric SUV'),('volvo','EX40','Electric SUV'),('volvo','EC40','Electric SUV'),
  ('volvo','XC60','SUV'),('volvo','XC90','SUV'),
  -- Land Rover
  ('landrover','Defender','SUV'),('landrover','Discovery Sport','SUV'),
  ('landrover','Range Rover Evoque','SUV'),('landrover','Range Rover Velar','SUV'),
  ('landrover','Range Rover Sport','SUV'),('landrover','Range Rover','SUV'),
  -- Lexus
  ('lexus','ES','Sedan'),('lexus','NX','SUV'),('lexus','RX','SUV'),('lexus','LM','MPV'),
  ('lexus','LX','SUV'),
  -- Tesla
  ('tesla','Model Y','Electric SUV')
on conflict (brand_id, name) do nothing;

-- Start every brand × city counter at zero so the app shows them all
insert into public.group_counts (brand_id, city_id)
select b.id, c.id from public.brands b cross join public.cities c
on conflict do nothing;
