-- ============================================================
-- BarberOS — Migration 006
-- Subscriptions: tenant licensing & plan management
-- ============================================================

-- Enable btree_gist for the EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
CREATE TYPE subscription_plan AS ENUM ('basic', 'premium', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'suspended');

-- ------------------------------------------------------------
-- SUBSCRIPTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan                  subscription_plan NOT NULL DEFAULT 'basic',
  status                subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  trial_ends_at         TIMESTAMPTZ,
  price_paid            NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  payment_method        TEXT NOT NULL DEFAULT 'manual',
  payment_reference     TEXT,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  suspended_at          TIMESTAMPTZ,
  suspended_reason      TEXT,
  max_staff             INTEGER NOT NULL DEFAULT 3,
  max_services          INTEGER NOT NULL DEFAULT 10,
  has_whatsapp          BOOLEAN NOT NULL DEFAULT false,
  has_analytics         BOOLEAN NOT NULL DEFAULT false,
  has_inventory         BOOLEAN NOT NULL DEFAULT false,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_sub_per_tenant
    EXCLUDE USING gist (tenant_id WITH =) WHERE (status IN ('active', 'trialing'))
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expiry ON public.subscriptions(current_period_end) WHERE status IN ('active', 'trialing');

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SuperAdmin: full access to all subscriptions
CREATE POLICY "superadmin_full_access" ON public.subscriptions
  FOR ALL USING (public.is_superadmin());

-- Tenant owner/admin: read-only access to their own subscription
CREATE POLICY "tenant_owner_read" ON public.subscriptions
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tenant_staff
      WHERE tenant_id = subscriptions.tenant_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
