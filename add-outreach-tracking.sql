-- Re-outreach tracking migration
-- Adds outreach_attempt to whatsapp_conversations so we know which attempt
-- this conversation represents (1st, 2nd, 3rd contact).
-- After MAX attempts with no reply, the lead is marked cold.

-- Track which outreach attempt this conversation is (1 = first contact, 2 = first follow-up, etc.)
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS outreach_attempt INT NOT NULL DEFAULT 1;

-- Index for quickly finding timed-out conversations that are eligible for re-outreach
CREATE INDEX IF NOT EXISTS idx_wa_conversations_timeout_requeue
  ON whatsapp_conversations(status, outreach_attempt)
  WHERE status = 'no_reply';

-- Permanent opt-out blocklist.
-- Phones in this table must NEVER be contacted again (Meta WhatsApp Business Policy).
-- Distinct from "not interested" — opted_out is a permanent, legally binding request.
CREATE TABLE IF NOT EXISTS whatsapp_opt_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_opt_out_phone ON whatsapp_opt_out(phone);

-- RLS + service role access (matches existing WhatsApp tables)
ALTER TABLE whatsapp_opt_out ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON whatsapp_opt_out FOR ALL USING (true);
