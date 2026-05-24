-- ============================================================
-- Phase 5: Business Intelligence & Analytics
-- ============================================================

-- Function to get top barbers by revenue
create or replace function public.get_top_barbers(p_tenant_id uuid, p_limit integer default 5)
returns table (
  barber_name text,
  total_revenue numeric,
  appointment_count bigint
) language sql stable as $$
  select 
    p.full_name as barber_name,
    sum(a.total_price) as total_revenue,
    count(a.id) as appointment_count
  from public.appointments a
  join public.tenant_staff ts on a.staff_id = ts.id
  join public.profiles p on ts.user_id = p.id
  where a.tenant_id = p_tenant_id and a.status = 'completed'
  group by p.full_name
  order by total_revenue desc
  limit p_limit;
$$;

-- Function to get service popularity
create or replace function public.get_service_stats(p_tenant_id uuid)
returns table (
  service_name text,
  usage_count bigint,
  revenue numeric
) language sql stable as $$
  select 
    s.name as service_name,
    count(a.id) as usage_count,
    sum(a.total_price) as revenue
  from public.appointments a
  join public.services s on a.service_id = s.id
  where a.tenant_id = p_tenant_id and a.status = 'completed'
  group by s.name
  order by usage_count desc;
$$;

-- Client-side stats function
create or replace function public.get_client_stats(p_client_id uuid)
returns json language plpgsql stable as $$
declare
  v_stats json;
begin
  select json_build_object(
    'total_visits', count(*),
    'total_spent', coalesce(sum(total_price), 0),
    'favorite_service', (
      select s.name 
      from public.appointments a2
      join public.services s on a2.service_id = s.id
      where a2.client_id = p_client_id
      group by s.name
      order by count(*) desc
      limit 1
    )
  ) into v_stats
  from public.appointments
  where client_id = p_client_id and status = 'completed';
  
  return v_stats;
end;
$$;
