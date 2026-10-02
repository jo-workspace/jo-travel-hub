-- Create flights table
create table if not exists public.flights (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  type text not null default 'outbound',
  airline text not null,
  flight_number text not null,
  departure_airport text not null,
  departure_city text,
  departure_date text,
  departure_time text not null,
  arrival_airport text not null,
  arrival_city text,
  arrival_date text,
  arrival_time text not null,
  terminal text,
  gate text,
  pnr text,
  check_in_status text not null default 'none',
  seat_status text default 'unselected',
  seat_numbers text,
  checked_baggage text,
  carry_on_baggage text,
  ticket_url text,
  note text,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.flights enable row level security;

-- Create policy for anon access (consistent with other tables in this project)
create policy "Allow all operations on flights"
  on public.flights for all
  using (true)
  with check (true);

create index if not exists idx_flights_trip_id on public.flights(trip_id);
