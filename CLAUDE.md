# WinFinance - Lead Management System (סוכנות ביטוח פלג)

## Project Overview

Lead management system for Peleg Insurance Agency (WinFinance). Handles end-to-end lead lifecycle from intake through multiple channels (Gmail, Google Sheets, CSV import, manual entry) to deal closure. The root URL (`/`) serves a public-facing landing page; the admin dashboard lives at `/admin`.

### Users & Roles

| Role | Users | Access |
|------|-------|--------|
| `admin` | Peleg | Full access: all leads, analytics, settings, user management |
| `coordinator` | Leah | New lead review, relevance marking, agent assignment, lead creation |
| `agent` | Yakir, Idan, Dor, Adi, Oriel | View assigned leads only, status updates, notes |
| `lead_supplier` | External suppliers | Submit leads via supplier dashboard, view own leads |

## Technical Stack

- **Framework**: Next.js 15 (App Router, TypeScript, React 19)
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Styling**: Tailwind CSS v3 with `tailwindcss-animate`, dark mode via class strategy
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Dual auth system - Supabase Auth (user login) + NextAuth.js (Google OAuth for Gmail integration)
- **Hosting**: Vercel (region: `fra1`)
- **Cron**: Vercel Cron for Gmail watch renewal (every 6 days)
- **Analytics**: Vercel Analytics
- **Node**: v20 (`.nvmrc`)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 3010
npm run build        # Production build (ESLint disabled during builds)
npm run start        # Production server on port 3010
npm run lint         # Run ESLint
```

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth (Google OAuth for Gmail)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# API Security
WEBHOOK_SECRET=
INTERNAL_API_SECRET=

# External integrations (optional)
SURANCE_API_URL=
SURANCE_API_KEY=
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (Hebrew RTL, Geist font)
│   ├── page.tsx                    # Public landing page
│   ├── globals.css                 # Global styles with CSS variables (oklch)
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout with AuthProvider + SessionProvider
│   │   ├── providers.tsx           # Client-side auth providers wrapper
│   │   └── page.tsx                # Admin dashboard entry (renders FullDashboard)
│   └── api/
│       ├── auth/[...nextauth]/     # Google OAuth (Gmail integration)
│       ├── leads/
│       │   ├── route.ts            # GET (list), POST (create), PATCH (update)
│       │   ├── [id]/route.ts       # Single lead operations
│       │   └── create/route.ts     # Lead creation endpoint
│       ├── api-keys/               # API key management
│       ├── users/                  # User management (including password reset)
│       ├── import-csv/             # CSV lead import
│       ├── export-csv/             # CSV lead export
│       ├── detect-csv-headers/     # CSV header detection
│       ├── gmail/
│       │   ├── webhook/            # Gmail push notification webhook
│       │   ├── webhook-v2/         # Updated Gmail webhook
│       │   ├── setup-watch/        # Gmail watch setup
│       │   ├── renew-watch/        # Cron: renew Gmail watch (every 6 days)
│       │   ├── refresh-token/      # Gmail token refresh
│       │   └── test-watch/         # Gmail watch testing
│       ├── check-emails/           # Email checking endpoint
│       ├── check-gmail/            # Gmail checking endpoint
│       ├── create-lead-from-email/ # Create lead from parsed email
│       ├── parse-email/            # Email content parsing
│       ├── email-settings/         # Email configuration
│       ├── test-email-connection/  # Email connection testing
│       ├── test-webhook/           # Webhook testing
│       └── webhooks/lead-created/  # Webhook for external lead creation
├── components/
│   ├── FullDashboard.tsx           # Main admin SPA (tab-based navigation)
│   ├── Login.tsx                   # Login form component
│   ├── LeadEntryForm.tsx           # Manual lead creation form
│   ├── CSVImport.tsx               # CSV import with header mapping
│   ├── CSVExport.tsx               # CSV export functionality
│   ├── DatePicker.tsx              # Date picker component
│   ├── InlineDateTimePicker.tsx    # Inline date/time picker
│   ├── ClientAuthProvider.tsx      # Client auth provider wrapper
│   ├── agent/
│   │   └── AgentDashboard.tsx      # Agent-specific dashboard view
│   ├── dashboard/
│   │   ├── HomePage.tsx            # Admin home/analytics page
│   │   ├── analyticsUtils.ts       # Analytics calculation logic
│   │   ├── DateRangePicker.tsx     # Date range selector
│   │   ├── TimeRangeFilter.tsx     # Time range filter component
│   │   ├── AgentCard.tsx           # Agent info card
│   │   ├── CompactKPICard.tsx      # KPI metric card
│   │   ├── ModernKPICard.tsx       # Modern-styled KPI card
│   │   ├── CompactStatusChart.tsx  # Status distribution chart
│   │   ├── ModernCompactStatusChart.tsx
│   │   ├── StatusDistributionChart.tsx
│   │   ├── SourceDistributionChart.tsx
│   │   ├── SourceEffectivenessChart.tsx
│   │   ├── EnhancedAgentLeaderboard.tsx
│   │   ├── AgentsPerformanceRanking.tsx
│   │   └── EnhancedWelcomeBanner.tsx
│   ├── leads/
│   │   ├── LeadsPage.tsx           # Main leads table view
│   │   ├── ActionButtons.tsx       # Lead action buttons
│   │   ├── FiltersBar.tsx          # Combined filters bar
│   │   ├── FilterDropdown.tsx      # Generic filter dropdown
│   │   ├── AgentFilter.tsx         # Agent filter dropdown
│   │   ├── RelevanceFilter.tsx     # Relevance status filter
│   │   ├── StatusFilter.tsx        # Lead status filter
│   │   ├── SourceFilter.tsx        # Lead source filter
│   │   ├── SortableHeader.tsx      # Sortable table header
│   │   └── ModernSelector.tsx      # Modern dropdown selector
│   ├── settings/
│   │   ├── SettingsPage.tsx        # Settings page container
│   │   ├── UserManagement.tsx      # User/agent management
│   │   ├── EmailSettings.tsx       # Email configuration
│   │   └── GmailConnect.tsx        # Gmail OAuth connection
│   ├── supplier/
│   │   ├── SupplierDashboard.tsx   # Lead supplier dashboard
│   │   ├── SupplierLeadEntryForm.tsx
│   │   ├── SupplierLeadsTable.tsx
│   │   └── SupplierStatsBar.tsx
│   ├── landing/                    # Public landing page components
│   │   ├── header.tsx
│   │   ├── hero-section.tsx
│   │   ├── services-section.tsx
│   │   ├── advantages-section.tsx
│   │   ├── vision-section.tsx
│   │   ├── cta-section.tsx
│   │   ├── footer.tsx
│   │   ├── theme-provider.tsx
│   │   └── ui/                     # Landing-specific shadcn/ui components
│   ├── shared/
│   │   └── leadUtils.ts            # Shared lead utilities (status, formatting, date ranges)
│   ├── providers/
│   │   └── SessionProvider.tsx     # NextAuth session provider
│   └── ui/                         # shadcn/ui component library (50+ components)
├── contexts/
│   └── AuthContext.tsx             # Auth context (Supabase auth + role-based permissions)
├── hooks/
│   ├── use-mobile.ts              # Mobile detection hook
│   ├── use-toast.ts               # Toast notification hook
│   └── useScrollAnimation.tsx     # Scroll animation hook (landing page)
├── lib/
│   ├── supabase.ts                # Supabase client (browser singleton + server client)
│   ├── database.types.ts          # TypeScript types for DB schema
│   ├── api-auth.ts                # API key authentication middleware
│   ├── colorMappings.ts           # Color-to-status mapping system (CSV import)
│   └── utils.ts                   # cn() utility (clsx + tailwind-merge)
├── services/
│   ├── duplicatePreventionService.ts  # Multi-criteria duplicate lead detection
│   ├── emailMonitor.ts            # Email monitoring service
│   └── gmailService.ts            # Gmail API integration service
└── types/
    └── next-auth.d.ts             # NextAuth type augmentation

scripts/                           # Data migration and maintenance scripts
├── migrate-excel-leads.js         # Excel-to-Supabase migration
├── enhanced-lead-migration.js     # Enhanced migration with validation
├── safe-lead-migration.js         # Safe migration with rollback
├── backup-and-analyze-leads.js    # Backup utility
├── restore-backup.js              # Restore from backup
├── update-agent-assignments.js    # Bulk agent reassignment
├── check-agents-data.js           # Agent data verification
├── analyze-excel.js / debug-excel.js
├── verify-import.js
└── migration-guide.md

*.sql                              # SQL migration files (root level)
*.js                               # Utility/debug scripts (root level)
```

## Architecture Patterns

### Single-Page Admin Dashboard
The admin area (`/admin`) renders `FullDashboard.tsx` which acts as a client-side SPA with tab-based navigation (home, leads, settings). Page state is persisted in `sessionStorage`. The component fetches all data (leads + agents) from Supabase directly and manages filters, sorting, and search client-side.

### Authentication (Dual System)
1. **Supabase Auth** (primary): Email/password login for all users. `AuthContext` wraps the admin layout, provides `useAuth()` hook with role-based permission helpers (`isAdmin()`, `isCoordinator()`, `canCreateLeads()`, etc.).
2. **NextAuth.js** (Gmail only): Google OAuth used exclusively to connect Gmail for automated lead intake. Tokens stored in `gmail_tokens` table.

### API Authentication
External API access uses API keys (prefix `wf_`, 35 chars). The `requireApiAuth()` middleware in `src/lib/api-auth.ts` validates keys against the `api_keys` table. Internal requests bypass auth via `X-Internal-Secret` header or localhost detection.

### Supabase Client Pattern
- **Browser**: Singleton via `getSupabase()` in `src/lib/supabase.ts` using the anon key
- **Server/API routes**: `getServerSupabase()` using the service role key (bypasses RLS)
- API route files create their own service-role clients via local `getSupabaseClient()` functions

### Duplicate Prevention
`DuplicatePreventionService` (`src/services/duplicatePreventionService.ts`) performs multi-criteria checks before creating leads:
1. Exact phone match
2. Name + similar phone (1-digit typo tolerance)
3. Same name + phone within last hour
4. Exact email match

### Color Code System
Leads imported from Excel/CSV can have color codes that map to statuses (defined in `src/lib/colorMappings.ts`):
- Green = במעקב (follow-up)
- Yellow = תואם (meeting scheduled)
- Orange = התקיימה - כשלון (meeting failed)
- White = אין מענה - לתאם מחדש (no answer)
- Blue = עסקה נסגרה (deal closed)
- Red = לא רלוונטי (not relevant, affects relevance only)

## Database Schema (Current)

### leads table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| lead_name | TEXT | Required |
| phone | TEXT | Required |
| email | TEXT | Optional |
| source | TEXT | 'Email', 'Google Sheet', 'Manual', 'Other', or custom |
| relevance_status | ENUM | 'ממתין לבדיקה', 'רלוונטי', 'לא רלוונטי', 'במעקב', 'אין מענה' |
| status | ENUM | 'ליד חדש', 'תואם', 'אין מענה - לתאם מחדש', 'התקיימה - כשלון', 'במעקב', 'עסקה נסגרה', 'לא רלוונטי' |
| assigned_agent_id | UUID (FK) | References agents.id |
| meeting_date | TIMESTAMP | Scheduled meeting |
| scheduled_call_date | TIMESTAMP | Scheduled callback |
| agent_notes | TEXT | Free text |
| color_code | TEXT | Color from import |
| price | NUMERIC | Deal value |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

### agents table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | TEXT | Agent display name |
| email | TEXT | Login email (lowercase) |
| role | ENUM | 'admin', 'coordinator', 'agent', 'lead_supplier' |
| created_at | TIMESTAMP | |

### Additional tables
- **api_keys**: API key storage (id, agent_id, api_key, name, is_active, permissions, last_used_at)
- **gmail_tokens**: OAuth tokens for Gmail integration (user_email, access_token, refresh_token, token_expiry)
- **email_logs**: Email processing and duplicate detection logs
- **gmail_watch**: Gmail push notification watch state

## Enum Values Reference (Current)

```typescript
// Relevance Status (set by coordinator)
type RelevanceStatus = 'ממתין לבדיקה' | 'רלוונטי' | 'לא רלוונטי' | 'במעקב' | 'אין מענה'

// Lead Status (set by agent)
type LeadStatus = 'ליד חדש' | 'תואם' | 'אין מענה - לתאם מחדש' | 'התקיימה - כשלון' | 'במעקב' | 'עסקה נסגרה' | 'לא רלוונטי'

// Agent Roles
type AgentRole = 'admin' | 'coordinator' | 'agent' | 'lead_supplier'

// Source (string, not strict enum)
type Source = 'Email' | 'Google Sheet' | 'Manual' | 'Other' | string
```

## Status Flow

### Relevance Status (Set by Coordinator)
```
ממתין לבדיקה (Pending Review) → רלוונטי (Relevant) → Assign to agent
                               → לא רלוונטי (Not Relevant) → Close
                               → במעקב (Follow-up)
                               → אין מענה (No Answer)
```

### Lead Status (Set by Agent)
```
ליד חדש (New Lead) → תואם (Meeting Scheduled) [requires meeting_date]
                   → אין מענה - לתאם מחדש (No Answer - Reschedule)
                   → התקיימה - כשלון (Meeting Failed)
                   → במעקב (Follow-up)
                   → עסקה נסגרה (Deal Closed)
                   → לא רלוונטי (Not Relevant)
```

### Automatic Status Transitions (in `leadUtils.ts`)
- Setting relevance to 'לא רלוונטי' also sets status to 'לא רלוונטי'
- Setting relevance to 'רלוונטי' when agent assigned and status is 'ליד חדש' upgrades status to 'תואם'
- Assigning an agent to a 'רלוונטי' lead with 'ליד חדש' status upgrades to 'תואם'

## API Endpoints

### Leads
```
GET    /api/leads              # List leads (paginated, filtered, role-restricted)
POST   /api/leads              # Create lead (with duplicate prevention)
PATCH  /api/leads              # Update lead (by id in body)
GET    /api/leads/[id]         # Get single lead
POST   /api/leads/create       # Alternative creation endpoint
```

### Query Parameters (GET /api/leads)
`?relevance_status=`, `?assigned_agent_id=`, `?status=`, `?source=`, `?created_after=`, `?created_before=`, `?page=`, `?limit=`, `?id=`

### Authentication Required
All API endpoints require either:
- `X-API-Key` header (format: `wf_` + 32 chars)
- `X-Internal-Secret` header (for internal services)
- Localhost origin (development only)

### Other Endpoints
```
POST   /api/import-csv             # CSV import
GET    /api/export-csv             # CSV export
POST   /api/detect-csv-headers     # Detect CSV column headers
GET    /api/users                  # List users
PATCH  /api/users/[id]/password    # Reset user password
GET    /api/api-keys               # List API keys
POST   /api/api-keys               # Create API key
POST   /api/webhooks/lead-created  # External webhook for lead creation
POST   /api/gmail/webhook          # Gmail push notifications
POST   /api/gmail/webhook-v2       # Updated Gmail webhook
GET    /api/gmail/renew-watch      # Cron: renew Gmail watch
```

## Key Conventions

### RTL / Hebrew
- Root `<html>` has `lang="he" dir="rtl"`
- All UI text is in Hebrew
- API error messages are in Hebrew
- Israeli phone format validation (9-10 digits, 0-prefix)
- Israeli timezone considerations (Asia/Jerusalem)
- Week starts on Sunday (Israeli calendar)

### Styling
- shadcn/ui components with oklch CSS variables for theming
- `cn()` utility from `src/lib/utils.ts` for conditional classes
- Two parallel UI component sets: `src/components/ui/` (admin) and `src/components/landing/ui/` (landing page)
- Responsive design with mobile-first approach (important for field agents)
- Pull-to-refresh and swipe gestures on mobile

### TypeScript
- Types generated from Supabase schema in `src/lib/database.types.ts`
- Helper types exported: `Lead`, `Agent`, `LeadInsert`, `LeadUpdate`, `LeadStatus`, `RelevanceStatus`, `AgentRole`
- `@ts-ignore` used in some places for Supabase query typing issues
- Path aliases via `@/` mapped to `src/`

### Data Fetching
- Admin dashboard fetches data directly from Supabase client-side (no API routes for internal reads)
- API routes use server-side Supabase client with service role key (bypasses RLS)
- No React Server Components for data fetching; all admin pages are `'use client'`

### Error Handling
- API routes return JSON with Hebrew error messages
- HTTP status codes: 400 (validation), 401 (auth), 403 (permission), 404 (not found), 409 (duplicate), 500 (server error)

## Deployment

- **Platform**: Vercel
- **Region**: `fra1` (Frankfurt)
- **Cron Jobs**: Gmail watch renewal every 6 days (`vercel.json`)
- **ESLint**: Disabled during production builds (`next.config.ts`)
- **Build**: `npm run build` (Next.js static + server)
- **Port**: 3010 (dev and production)

## Important Notes for AI Assistants

1. **Do not modify** the `src/components/ui/` or `src/components/landing/ui/` directories directly - these are shadcn/ui generated components. Use `npx shadcn@latest add <component>` to add new ones.
2. **Database types** in `src/lib/database.types.ts` must stay in sync with the actual Supabase schema. The enums there reflect the current DB state.
3. **Root-level `.js` and `.sql` files** are one-off migration/debug scripts, not part of the running application. Do not import them.
4. **The `lead-management/` directory** contains stale build artifacts from a previous iteration - ignore it.
5. **Port 3010** is used for dev and production, not the default 3000.
6. **All admin pages are client-side** (`'use client'`). The admin area is effectively an SPA rendered inside a Next.js shell.
7. **When adding new status values**, update both the `database.types.ts` file and the corresponding Supabase enum via SQL migration.
8. **The `leadUtils.ts` file** contains critical business logic for automatic status transitions - review it before making status-related changes.
