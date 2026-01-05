-- Create email_settings table for automated email monitoring
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_host TEXT NOT NULL, -- IMAP server host (e.g., imap.gmail.com)
    email_port INTEGER NOT NULL, -- IMAP port (e.g., 993)
    email_username TEXT NOT NULL, -- Email username/address
    email_password TEXT NOT NULL, -- Email password or app password
    email_secure BOOLEAN DEFAULT true, -- Use SSL/TLS
    monitored_email_addresses TEXT[] DEFAULT '{}', -- Array of email addresses to monitor
    email_enabled BOOLEAN DEFAULT false, -- Enable/disable email monitoring
    last_check_date TIMESTAMP WITH TIME ZONE, -- Last time emails were checked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage email settings
CREATE POLICY "Enable read access for admins" ON email_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable insert for admins" ON email_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Enable update for admins" ON email_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create email_processing_log table to track processed emails
CREATE TABLE IF NOT EXISTS email_processing_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_message_id TEXT NOT NULL, -- Email message ID to prevent duplicates
    sender_email TEXT NOT NULL,
    subject TEXT,
    lead_id UUID REFERENCES leads(id),
    processing_status TEXT CHECK (processing_status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE email_processing_log ENABLE ROW LEVEL SECURITY;

-- Create policies for email processing log
CREATE POLICY "Enable read access for coordinators and admins" ON email_processing_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
        )
    );

-- Create unique index to prevent duplicate email processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_message_id ON email_processing_log(email_message_id);

-- Add email processing status to leads table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email_processed') THEN
        ALTER TABLE leads ADD COLUMN email_processed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;