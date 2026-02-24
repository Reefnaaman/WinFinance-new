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
