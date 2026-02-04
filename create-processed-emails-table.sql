-- Create table to track processed Gmail messages and prevent duplicates
-- This ensures no email is processed twice by any system

CREATE TABLE IF NOT EXISTS processed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gmail_message_id TEXT UNIQUE NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by TEXT NOT NULL, -- 'webhook' or 'cron' or 'manual'
    email_from TEXT,
    email_subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_emails_gmail_message_id ON processed_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_processed_at ON processed_emails(processed_at);

-- Add some comments for documentation
COMMENT ON TABLE processed_emails IS 'Tracks Gmail messages that have been processed to prevent duplicate lead creation';
COMMENT ON COLUMN processed_emails.gmail_message_id IS 'Gmail message ID from the API';
COMMENT ON COLUMN processed_emails.processed_by IS 'System that processed this email (webhook/cron/manual)';