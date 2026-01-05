# WinFinance Lead Management - Role System Documentation

## Role Hierarchy & Permissions

### 🔴 Admin (`role: 'admin'`)
**Example: פלג**

**Capabilities:**
- ✅ **Full system access** - can view all pages and features
- ✅ **Lead management** - view, edit, create, delete any lead
- ✅ **Take leads** - can be assigned leads and appear in agent rankings
- ✅ **Agent management** - create, edit, delete agents
- ✅ **User management** - manage all user accounts and roles
- ✅ **System settings** - configure email monitoring, integrations
- ✅ **Analytics access** - view all dashboard analytics and reports
- ✅ **Price editing** - can edit closing prices on any lead

### 🟡 Coordinator (`role: 'coordinator'`)
**Example: לאה**

**Capabilities:**
- ✅ **Lead review** - mark relevance status (ממתין לבדיקה → רלוונטי/לא רלוונטי)
- ✅ **Agent assignment** - assign leads to agents
- ✅ **Meeting scheduling** - schedule meetings for agents
- ✅ **Manual lead entry** - create new leads
- ✅ **Pipeline overview** - view all leads and their status
- ✅ **Price editing** - can edit closing prices on any lead
- ❌ **Cannot take leads** - does not appear in agent rankings
- ❌ **Limited system settings** - cannot configure email/technical settings

### 🟢 Agent (`role: 'agent'`)
**Examples: יקיר, עידן, דור, עדי, אוריאל**

**Capabilities:**
- ✅ **View assigned leads only** - can only see leads assigned to them
- ✅ **Update lead status** - change status (לא תואם, תואם, עסקה נסגרה, etc.)
- ✅ **Add notes** - add agent_notes to their leads
- ✅ **Schedule meetings** - set meeting dates for their leads
- ✅ **Price editing** - can edit closing prices on THEIR assigned leads only
- ✅ **Appear in rankings** - show in agent performance analytics
- ❌ **Cannot reassign leads** - cannot change agent assignments
- ❌ **Cannot create leads** - no manual lead entry access
- ❌ **No system access** - only see leads page

### 🟠 Lead Supplier (`role: 'lead_supplier'`)
**Purpose: External lead generation partners**

**Capabilities:**
- ✅ **Submit leads** - can create new leads in the system
- ✅ **View submitted leads** - see status of leads they provided
- ✅ **Track performance** - view conversion rates of their leads
- ❌ **Cannot manage other leads** - no access to leads from other sources
- ❌ **Cannot assign agents** - no lead assignment capabilities
- ❌ **Limited system access** - focused interface for lead submission only

## Database Schema

```sql
CREATE TABLE public.agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'coordinator', 'agent', 'lead_supplier')) DEFAULT 'agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## Current Users (as per setup-database.js)

| Name | Email | Role | Can Take Leads? | Shows in Rankings? |
|------|-------|------|----------------|-------------------|
| פלג | peleg@winfinance.com | admin | ✅ | ✅ |
| לאה | leah@winfinance.com | coordinator | ❌ | ❌ |
| יקיר | yakir@winfinance.com | agent | ✅ | ✅ |
| עידן | idan@winfinance.com | agent | ✅ | ✅ |
| דור | dor@winfinance.com | agent | ✅ | ✅ |
| עדי | adi@winfinance.com | agent | ✅ | ✅ |
| אוריאל | oriel@winfinance.com | agent | ✅ | ✅ |
| ספק לידים | supplier@winfinance.com | lead_supplier | ❌ | ❌ |

## Implementation Logic

### Agent Rankings Filter
```javascript
// Show admin + agents in rankings (both can take leads)
const rankingAgents = dbAgents.filter(a => a.role === 'agent' || a.role === 'admin')
```

### Lead Assignment Dropdown
```javascript
// Admin and agents can be assigned leads
const assignableUsers = dbAgents.filter(a => a.role === 'agent' || a.role === 'admin')
```

### Price Editing Permissions
```javascript
// Admin, coordinator can edit any lead's price
// Agents can only edit their own assigned leads' prices
const canEditPrice =
  user?.role === 'admin' ||
  user?.role === 'coordinator' ||
  (user?.role === 'agent' && lead.assigned_agent_id === user?.id)
```

### Navigation Access
```javascript
// Agents only see leads page
// Coordinators see leads, manual entry, basic analytics
// Admin sees everything including settings, user management
```

## Single Source of Truth

1. **Database**: Supabase `agents` table is the single source of truth
2. **Setup**: Use `setup-database.js` to initialize proper users
3. **No hardcoded data**: All user lists pulled from database
4. **Role consistency**: All permissions based on database `role` field

## Data Flow

1. **Authentication** → Supabase Auth identifies user
2. **Role Loading** → Fetch user record from `agents` table
3. **Permission Check** → All UI decisions based on `user.role`
4. **Data Filtering** → Query restrictions applied based on role
5. **Action Authorization** → Server validates role before mutations

This ensures organizational clarity and prevents role confusion like לאה appearing in agent rankings.