-- Create table to store Gmail watch information
CREATE TABLE IF NOT EXISTS gmail_watch (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  history_id TEXT,
  expiration TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE gmail_watch IS 'Stores Gmail watch/webhook subscription info';