-- ============================================================
-- BarberOS — Migration 008
-- License notifications: subscription lifecycle messaging
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
CREATE TYPE notification_channel AS ENUM ('whatsapp', 'email', 'both');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- ------------------------------------------------------------
-- LICENSE NOTIFICATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE public.license_notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id   UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel           notification_channel NOT NULL DEFAULT 'whatsapp',
  trigger_type      TEXT NOT NULL,
  scheduled_for     TIMESTAMPTZ NOT NULL,
  sent_at           TIMESTAMPTZ,
  status            notification_status NOT NULL DEFAULT 'pending',
  error_message     TEXT,
  recipient_phone   TEXT,
  recipient_email   TEXT,
  message_content   TEXT,
  wa_message_id     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_license_notif_pending ON public.license_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_license_notif_sub ON public.license_notifications(subscription_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.license_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_only" ON public.license_notifications FOR ALL USING (public.is_superadmin());
