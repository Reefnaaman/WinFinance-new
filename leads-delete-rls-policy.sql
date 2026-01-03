-- RLS Policies for Leads Table - Delete Restriction
-- Only admins can delete leads

-- First, enable RLS on leads table if not already enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policies if they exist
DROP POLICY IF EXISTS "leads_delete_policy" ON leads;
DROP POLICY IF EXISTS "admin_delete_leads" ON leads;

-- Create new delete policy - ONLY admin can delete
CREATE POLICY "admin_delete_leads" ON leads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role = 'admin'
    )
  );

-- Ensure select policies exist for all roles
DROP POLICY IF EXISTS "agents_select_own_leads" ON leads;
CREATE POLICY "agents_select_own_leads" ON leads
  FOR SELECT
  USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role IN ('admin', 'coordinator')
    )
  );

-- Ensure update policies exist
DROP POLICY IF EXISTS "agents_update_leads" ON leads;
CREATE POLICY "agents_update_leads" ON leads
  FOR UPDATE
  USING (
    -- Agents can only update their own leads (status and notes only)
    (assigned_agent_id = auth.uid())
    OR
    -- Coordinators and admins can update any lead
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    -- Agents can only update their own leads
    (assigned_agent_id = auth.uid())
    OR
    -- Coordinators and admins can update any lead
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role IN ('admin', 'coordinator')
    )
  );

-- Ensure insert policies exist (for creating new leads)
DROP POLICY IF EXISTS "insert_leads_policy" ON leads;
CREATE POLICY "insert_leads_policy" ON leads
  FOR INSERT
  WITH CHECK (
    -- Only coordinators and admins can create new leads
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = auth.uid()
      AND agents.role IN ('admin', 'coordinator')
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON leads TO authenticated;
-- Explicitly revoke DELETE from non-admin users (RLS will handle this, but being explicit)
REVOKE DELETE ON leads FROM authenticated;
-- Re-grant DELETE only through RLS policies
GRANT DELETE ON leads TO authenticated;

-- Add a comment to document the policy
COMMENT ON POLICY "admin_delete_leads" ON leads IS 'Only admins can delete leads. Coordinators and agents cannot delete.';

-- Verify the policies are in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;