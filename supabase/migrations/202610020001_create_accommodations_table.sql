-- Create accommodations table
create table if not exists public.accommodations (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  city_area text,
  check_in_date text not null,
  check_out_date text not null,
  platform text not null,
  booker text not null,
  price numeric,
  currency text default 'TWD',
  room_type text,
  free_cancellation_deadline text,
  status text not null default 'candidate',
  booking_ref text,
  booking_url text,
  map_url text,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.accommodations enable row level security;

-- Create policy for anon access (consistent with other tables in this project)
create policy "Allow all operations on accommodations"
  on public.accommodations for all
  using (true)
  with check (true);

create index if not exists idx_accommodations_trip_id on public.accommodations(trip_id);
