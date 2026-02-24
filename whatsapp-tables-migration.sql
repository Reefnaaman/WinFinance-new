-- WhatsApp Automation Tables Migration
-- Run this in your Supabase SQL Editor

-- 1. WhatsApp Conversations - tracks the state of each AI conversation with a lead
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  -- Statuses: queued, template_sent, active, meeting_scheduled, not_interested, no_reply, error
  assigned_agent_id UUID REFERENCES agents(id),
  meeting_date TIMESTAMPTZ,
  meeting_slot_start TIMESTAMPTZ,
  meeting_slot_end TIMESTAMPTZ,
  ai_context JSONB DEFAULT '[]'::jsonb,
  -- Stores the conversation history for Claude AI context
  template_sent_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  batch_window TEXT,
  -- Which batch triggered this: 'morning' (9:34) or 'afternoon' (14:20)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. WhatsApp Messages - log of all sent/received messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message_type TEXT NOT NULL DEFAULT 'text',
  -- Types: text, template, interactive, image
  content TEXT NOT NULL,
  whatsapp_message_id TEXT,
  -- Meta's message ID for tracking delivery
  status TEXT DEFAULT 'pending',
  -- Statuses: pending, sent, delivered, read, failed
  error_details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. WhatsApp Outreach Queue - leads waiting to be contacted at next batch window
CREATE TABLE IF NOT EXISTS whatsapp_outreach_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Statuses: pending, processing, sent, skipped, failed
  scheduled_batch TEXT,
  -- 'morning' or 'afternoon' (assigned when queued based on time of day)
  scheduled_date DATE,
  -- Date the message should be sent
  skip_reason TEXT,
  -- Why it was skipped (e.g., 'weekend', 'duplicate_conversation', 'outside_hours')
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 4. Agent schedule tracking for round-robin
CREATE TABLE IF NOT EXISTS agent_meeting_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  lead_id UUID REFERENCES leads(id),
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  is_booked BOOLEAN DEFAULT false,
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wa_conversations_lead_id ON whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_whatsapp_id ON whatsapp_messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_queue_status ON whatsapp_outreach_queue(status);
CREATE INDEX IF NOT EXISTS idx_wa_queue_scheduled ON whatsapp_outreach_queue(scheduled_date, scheduled_batch);
CREATE INDEX IF NOT EXISTS idx_agent_slots_date ON agent_meeting_slots(slot_date, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_slots_available ON agent_meeting_slots(slot_date, is_booked);

-- Unique constraint: one active conversation per lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_conversations_active_lead
  ON whatsapp_conversations(lead_id)
  WHERE status NOT IN ('meeting_scheduled', 'not_interested', 'no_reply', 'error');

-- Unique constraint: one queue entry per lead per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_queue_lead_date
  ON whatsapp_outreach_queue(lead_id, scheduled_date)
  WHERE status = 'pending';

-- RLS policies (service role bypasses these, but good practice)
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_outreach_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_meeting_slots ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access" ON whatsapp_conversations FOR ALL USING (true);
CREATE POLICY "Service role full access" ON whatsapp_messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON whatsapp_outreach_queue FOR ALL USING (true);
CREATE POLICY "Service role full access" ON agent_meeting_slots FOR ALL USING (true);
