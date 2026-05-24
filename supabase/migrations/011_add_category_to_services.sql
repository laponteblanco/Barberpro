-- Add category column to services table
alter table public.services 
  add column category text,
  add column description text;
