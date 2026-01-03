# Lead Management System - סוכנות ביטוח פלג
# Project Development Guidelines

## Project Overview
Lead management system for Peleg Insurance Agency - end-to-end lead handling from intake to deal closure.

### Key Features
- Centralized lead collection from multiple sources (Gmail, Google Sheets, manual input)
- Lead filtering and classification by coordinator (Leah)
- Agent assignment and status tracking
- Visual pipeline and performance analytics
- Surance CRM integration

### Users & Roles
- **Peleg (Admin)**: Full access, analytics, system settings
- **Leah (Coordinator)**: New lead review, relevance marking, agent assignment, meeting scheduling
- **Agents** (Yakir, Idan, Dor, Adi, Oriel): View assigned leads only, status updates, notes

## Technical Stack
- **Frontend**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS (RTL support for Hebrew)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel
- **Automation**: Make (Integromat)

## Database Schema

### leads table
```sql
id: UUID (PK, auto-generated)
lead_name: TEXT (required) - Full name of lead
phone: TEXT (required) - Phone number
email: TEXT (optional) - Email address
source: ENUM (required) - 'Email' | 'Google Sheet' | 'Manual' | 'Other'
created_at: TIMESTAMP (auto-generated)
relevance_status: ENUM (required) - 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי'
assigned_agent_id: UUID (FK, optional) - References agents.id
meeting_date: TIMESTAMP (optional) - Scheduled meeting date
status: ENUM (optional) - 'לא תואם' | 'לקוח לא רצה' | 'תואם' | 'עסקה נסגרה'
agent_notes: TEXT (optional) - Free text notes from agent
updated_at: TIMESTAMP (auto-updated)
```

### agents table
```sql
id: UUID (PK)
name: TEXT (required) - Agent name
email: TEXT (required) - For system login
role: ENUM (required) - 'admin' | 'coordinator' | 'agent'
created_at: TIMESTAMP
```

### activity_log table (optional)
```sql
lead_id: UUID (FK) - References leads.id
agent_id: UUID (FK) - References agents.id
action: TEXT - 'status_change' | 'assignment' | 'note_added'
old_value: TEXT - Previous value
new_value: TEXT - New value
timestamp: TIMESTAMP
```

## Status Flow Logic

### Relevance Status (Set by Leah)
1. **ממתין לבדיקה** → New lead needs review
2. **רלוונטי** → Suitable for handling, assign to agent
3. **לא רלוונטי** → Not suitable, close

### Lead Status (Set by Agent)
1. **לא תואם** → Could not make contact
2. **לקוח לא רצה** → Customer not interested
3. **תואם** → Meeting scheduled (requires meeting_date)
4. **עסקה נסגרה** → Deal closed successfully

## UI Views by Role

### Admin (Peleg)
- Full leads table
- Pipeline visualization
- Analytics dashboard
- System settings

### Coordinator (Leah)
- New leads view (relevance_status = 'ממתין לבדיקה')
- Assignment view (relevance_status = 'רלוונטי' AND assigned_agent_id IS NULL)
- Manual lead entry
- Pipeline overview

### Agents
- My leads view (assigned_agent_id = current_user.id)
- Status updates and notes only

## API Endpoints

### Leads API
```
GET    /api/leads           - Get all leads (with filters)
POST   /api/leads           - Create new lead
GET    /api/leads/:id       - Get single lead
PATCH  /api/leads/:id       - Update lead
DELETE /api/leads/:id       - Delete lead
```

### Query Parameters for GET /api/leads
- `?relevance_status=ממתין לבדיקה`
- `?assigned_agent_id=uuid`
- `?status=תואם`
- `?source=Email`
- `?created_after=2025-01-01`
- `?created_before=2025-12-31`

### Webhook Endpoint
```
POST /api/webhooks/lead-created
Headers: X-Webhook-Secret: {{SECRET}}
```

## Make.com Automation Scenarios

### 1. Gmail → Lead
- **Trigger**: Gmail Watch Emails (specific label/from/subject)
- **Flow**: Gmail → Text Parser → HTTP Request to /api/leads
- **Payload**:
  ```json
  {
    "lead_name": "{{parsed_name}}",
    "phone": "{{parsed_phone}}",
    "email": "{{parsed_email}}",
    "source": "Email"
  }
  ```

### 2. Google Sheets → Lead
- **Trigger**: Google Sheets Watch Rows (every 15 minutes)
- **Flow**: Sheets → Iterator → HTTP Request to /api/leads
- **Payload**:
  ```json
  {
    "lead_name": "{{Column A}}",
    "phone": "{{Column B}}",
    "email": "{{Column C}}",
    "source": "Google Sheet"
  }
  ```

### 3. Lead → Surance CRM (Optional)
- **Trigger**: Webhook when status = 'עסקה נסגרה'
- **Flow**: Webhook → Surance API call

## Security & Permissions (Supabase RLS)

### Lead Access Policy
```sql
-- Agents can only see their assigned leads
CREATE POLICY "agents_select_own_leads" ON leads
  FOR SELECT USING (
    assigned_agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agents
      WHERE id = auth.uid()
      AND role IN ('admin', 'coordinator')
    )
  );

-- Agents can only update status and notes
CREATE POLICY "agents_update_own_leads" ON leads
  FOR UPDATE USING (assigned_agent_id = auth.uid())
  WITH CHECK (assigned_agent_id = auth.uid());
```

## Development Guidelines

### File Structure (Next.js 14 App Router)
```
app/
├── (auth)/
│   └── login/
├── dashboard/
├── leads/
│   ├── new/
│   ├── assign/
│   └── [id]/
├── pipeline/
├── api/
│   ├── leads/
│   └── webhooks/
└── globals.css

components/
├── ui/
├── leads/
├── pipeline/
└── dashboard/

lib/
├── supabase/
├── utils/
└── types/
```

### RTL Support Requirements
- All Hebrew text must be properly displayed RTL
- Use Tailwind RTL utilities (`rtl:`, `ltr:`)
- Form layouts should respect RTL flow
- Date pickers and dropdowns need RTL support

### Key Components to Implement
1. **LeadsTable** - Sortable, filterable table with actions
2. **StatusDropdown** - Status change with confirmation
3. **AgentAssignment** - Bulk agent assignment interface
4. **Pipeline** - Kanban board with drag & drop
5. **Analytics** - Charts and KPI widgets

## Enum Values Reference
```typescript
enum Source {
  EMAIL = 'Email',
  GOOGLE_SHEET = 'Google Sheet',
  MANUAL = 'Manual',
  OTHER = 'Other'
}

enum RelevanceStatus {
  PENDING = 'ממתין לבדיקה',
  RELEVANT = 'רלוונטי',
  NOT_RELEVANT = 'לא רלוונטי'
}

enum LeadStatus {
  NOT_CONTACTED = 'לא תואם',
  CUSTOMER_NOT_INTERESTED = 'לקוח לא רצה',
  MEETING_SCHEDULED = 'תואם',
  DEAL_CLOSED = 'עסקה נסגרה'
}

enum Role {
  ADMIN = 'admin',
  COORDINATOR = 'coordinator',
  AGENT = 'agent'
}
```

## Critical Implementation Notes
- All forms and tables must support Hebrew text properly
- Date handling needs to consider Israeli timezone (Asia/Jerusalem)
- Phone number validation should support Israeli formats
- Authentication flow must be seamless for non-technical users
- Mobile responsiveness is critical for field agents

## Future Features (Not in V1)
- Google Calendar integration
- Push/Email notifications
- PDF reports
- WhatsApp integration
- Full bi-directional Surance CRM sync

## Development Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WEBHOOK_SECRET=
SURANCE_API_URL=
SURANCE_API_KEY=
```