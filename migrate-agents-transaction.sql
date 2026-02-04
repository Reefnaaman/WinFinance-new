-- This script migrates agent IDs to match auth IDs
-- Run this directly in Supabase SQL Editor

BEGIN;

-- Step 1: Temporarily disable foreign key checks
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_assigned_agent_id_fkey;

-- Step 2: Update lead assignments
UPDATE leads SET assigned_agent_id = '60010665-515a-4c4b-9c9c-f3c6b9fb35a0' WHERE assigned_agent_id = 'a8a7e87c-2265-40f6-8378-2a97e26e148c'; -- יקיר
UPDATE leads SET assigned_agent_id = '977d2b7a-42e5-467b-9fb7-82f4d5ed301a' WHERE assigned_agent_id = 'b02ae845-eb60-4e16-b879-fbc2e5d67e1e'; -- עדי
UPDATE leads SET assigned_agent_id = 'b84e08a6-d500-49ea-981e-253a6beb6207' WHERE assigned_agent_id = '2192f6d3-2102-4f31-866f-64b5cb68f33c'; -- דור
UPDATE leads SET assigned_agent_id = 'a6989ac1-3bfb-480c-8206-9ce84a173ba4' WHERE assigned_agent_id = '4af83165-9332-4f8d-8148-b1852960b6d4'; -- עידן
UPDATE leads SET assigned_agent_id = 'd71e19e7-a64f-43f6-9c5a-0611f429e6ce' WHERE assigned_agent_id = '3411f2e7-29e7-4c44-8d39-46367aa20f15'; -- פלג

-- Step 3: Update agent IDs
UPDATE agents SET id = '60010665-515a-4c4b-9c9c-f3c6b9fb35a0' WHERE id = 'a8a7e87c-2265-40f6-8378-2a97e26e148c'; -- יקיר
UPDATE agents SET id = '977d2b7a-42e5-467b-9fb7-82f4d5ed301a' WHERE id = 'b02ae845-eb60-4e16-b879-fbc2e5d67e1e'; -- עדי
UPDATE agents SET id = 'b84e08a6-d500-49ea-981e-253a6beb6207' WHERE id = '2192f6d3-2102-4f31-866f-64b5cb68f33c'; -- דור
UPDATE agents SET id = 'a6989ac1-3bfb-480c-8206-9ce84a173ba4' WHERE id = '4af83165-9332-4f8d-8148-b1852960b6d4'; -- עידן
UPDATE agents SET id = 'd71e19e7-a64f-43f6-9c5a-0611f429e6ce' WHERE id = '3411f2e7-29e7-4c44-8d39-46367aa20f15'; -- פלג

-- Step 4: Re-enable foreign key constraint
ALTER TABLE leads ADD CONSTRAINT leads_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES agents(id);

-- Step 5: Verify the changes
SELECT name, id, email FROM agents ORDER BY name;

COMMIT;