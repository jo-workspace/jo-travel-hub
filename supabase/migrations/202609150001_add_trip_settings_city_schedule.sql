alter table public.trip_settings
  add column if not exists city_schedule text null default '';
