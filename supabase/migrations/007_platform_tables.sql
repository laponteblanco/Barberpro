-- ============================================================
-- BarberOS — Migration 007
-- Platform tables: revenue tracking, audit log, impersonation
-- ============================================================

-- ------------------------------------------------------------
-- PLATFORM REVENUE (manual payment tracking)
-- ------------------------------------------------------------
CREATE TABLE public.platform_revenue (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id   UUID NOT NULL REFERENCES public.subscriptions(id),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
  amount            NUMERIC(10,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  payment_method    TEXT NOT NULL DEFAULT 'manual',
  payment_reference TEXT,
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_only" ON public.platform_revenue FOR ALL USING (public.is_superadmin());

CREATE INDEX idx_platform_revenue_tenant ON public.platform_revenue(tenant_id);
CREATE INDEX idx_platform_revenue_date ON public.platform_revenue(created_at);

-- ------------------------------------------------------------
-- SUPERADMIN AUDIT LOG
-- ------------------------------------------------------------
CREATE TABLE public.superadmin_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action        TEXT NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_only" ON public.superadmin_audit_log FOR ALL USING (public.is_superadmin());

CREATE INDEX idx_sa_audit_admin ON public.superadmin_audit_log(admin_user_id);
CREATE INDEX idx_sa_audit_date ON public.superadmin_audit_log(created_at);

-- ------------------------------------------------------------
-- IMPERSONATION SESSIONS
-- ------------------------------------------------------------
CREATE TABLE public.impersonation_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id   UUID NOT NULL REFERENCES auth.users(id),
  target_role     TEXT NOT NULL,
  target_tenant_id UUID REFERENCES public.tenants(id),
  target_user_id  UUID REFERENCES auth.users(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_only" ON public.impersonation_sessions FOR ALL USING (public.is_superadmin());

-- ------------------------------------------------------------
-- TENANTS: Allow SuperAdmin full management
-- ------------------------------------------------------------
CREATE POLICY "superadmin_tenant_manage" ON public.tenants
  FOR ALL USING (public.is_superadmin());
