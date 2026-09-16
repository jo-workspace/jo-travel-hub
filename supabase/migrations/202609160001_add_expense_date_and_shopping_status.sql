-- Add date column to expense_items if not exists
alter table public.expense_items
  add column if not exists date text;

-- Add purchase_status column to shopping_items if not exists
alter table public.shopping_items
  add column if not exists purchase_status text not null default 'pending';

-- Update existing shopping_items purchase_status based on bought column
update public.shopping_items
set purchase_status = case
  when coalesce(bought, false) then 'purchased'
  else 'pending'
end
where purchase_status = 'pending';
