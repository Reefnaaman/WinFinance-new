-- Debug Script: Check Agent IDs and Their Assigned Leads
-- Run this in your Supabase SQL editor to understand the ID mismatch

-- 1. Check all agents and their IDs
SELECT
  id,
  name,
  email,
  role
FROM agents
ORDER BY role, name;

-- 2. Check leads assigned to agents
SELECT
  l.id as lead_id,
  l.lead_name,
  l.assigned_agent_id,
  a.id as actual_agent_id,
  a.name as agent_name,
  a.email as agent_email
FROM leads l
LEFT JOIN agents a ON l.assigned_agent_id = a.id
WHERE l.assigned_agent_id IS NOT NULL
ORDER BY a.name, l.created_at DESC
LIMIT 20;

-- 3. Check if there are any leads with mismatched agent IDs
SELECT
  l.lead_name,
  l.assigned_agent_id as assigned_id,
  'No matching agent' as issue
FROM leads l
WHERE l.assigned_agent_id IS NOT NULL
  AND l.assigned_agent_id NOT IN (SELECT id FROM agents);

-- 4. Count leads per agent
SELECT
  a.id,
  a.name,
  a.email,
  COUNT(l.id) as total_leads_assigned
FROM agents a
LEFT JOIN leads l ON l.assigned_agent_id = a.id
WHERE a.role = 'agent'
GROUP BY a.id, a.name, a.email
ORDER BY a.name;