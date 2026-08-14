-- ============================================================
-- BarberOS — Migration: Update calculate_barber_commission PL/pgSQL function
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_barber_commission(p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_staff_id uuid;
  v_tenant_id uuid;
  v_price numeric;
  v_rate numeric;
  v_start_time timestamptz;
  v_daily_rates jsonb;
  v_day_index text;
  v_timezone text;
BEGIN
  -- 1. Fetch appointment details
  SELECT staff_id, tenant_id, total_price, start_time 
  INTO v_staff_id, v_tenant_id, v_price, v_start_time
  FROM public.appointments 
  WHERE id = p_appointment_id;

  -- 2. Fetch staff commission rates
  SELECT commission_rate, daily_commission_rates 
  INTO v_rate, v_daily_rates
  FROM public.tenant_staff 
  WHERE id = v_staff_id;

  -- 3. Fetch tenant's timezone (fallback to America/Bogota or America/Caracas if NULL)
  SELECT COALESCE(timezone, 'America/Bogota')
  INTO v_timezone
  FROM public.tenants
  WHERE id = v_tenant_id;

  -- 4. Determine the day of week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday) converted to local timezone
  v_day_index := extract(dow from v_start_time AT TIME ZONE v_timezone)::text;

  -- 5. Check if a custom rate exists for that day in daily_commission_rates
  IF v_daily_rates IS NOT NULL AND v_daily_rates ? v_day_index THEN
    v_rate := (v_daily_rates->>v_day_index)::numeric;
  END IF;

  -- 6. Calculate and record the commission transaction
  IF v_rate > 0 THEN
    INSERT INTO public.barber_transactions (tenant_id, staff_id, amount, type, reference_id)
    VALUES (v_tenant_id, v_staff_id, (v_price * v_rate / 100), 'commission', p_appointment_id);
  END IF;
END;
$$;
