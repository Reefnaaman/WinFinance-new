# Lead Migration Guide

## Overview
This guide provides instructions for safely migrating leads in the WinFinance system.

## Available Migration Scripts

### 1. Enhanced Lead Migration (`enhanced-lead-migration.js`)
The primary migration tool with comprehensive safety features.

**Features:**
- Pre-flight system checks
- CSV validation and preview
- Dry run capability
- Automatic backup creation
- Batch import processing
- Detailed error reporting

**Usage:**
```bash
node scripts/enhanced-lead-migration.js
```

### 2. Backup and Analyze (`backup-and-analyze-leads.js`)
Creates backups and analyzes current system state.

**Usage:**
```bash
node scripts/backup-and-analyze-leads.js
```

### 3. Restore Backup (`restore-backup.js`)
Restores leads from a previous backup file.

**Usage:**
```bash
node scripts/restore-backup.js backups/leads-backup-2024-01-09.json
```

## CSV File Requirements

Your CSV file must include these columns:

### Required Columns:
- `lead_name` - Full name of the lead
- `phone` - Phone number

### Optional Columns:
- `email` - Email address
- `source` - Lead source (default: 'CSV Import')
- `relevance_status` - Status (default: 'ממתין לבדיקה')
- `status` - Lead status (default: 'לא תואם')
- `agent_notes` - Notes from agent
- `assigned_agent_id` - Agent UUID
- `meeting_date` - Meeting timestamp
- `price` - Price value
- `scheduled_call_date` - Call date timestamp

## Migration Process

### Step 1: Prepare Your CSV
Ensure your CSV file:
1. Has headers in the first row
2. Contains `lead_name` and `phone` columns
3. Uses UTF-8 encoding for Hebrew text
4. Has proper comma separation

### Step 2: Run Pre-Migration Backup
```bash
node scripts/backup-and-analyze-leads.js
```

### Step 3: Execute Migration
```bash
node scripts/enhanced-lead-migration.js
```

Follow the prompts:
1. Enter CSV file path
2. Review validation results
3. Optionally run dry run first
4. Confirm migration

### Step 4: Verify Results
The script will:
- Show import progress
- Display final count
- Provide sample of imported leads

## Rollback Process

If you need to undo a migration:

1. Locate your backup file in `/backups/`
2. Run restore command:
```bash
node scripts/restore-backup.js backups/[your-backup-file].json
```

## Safety Features

### Pre-Flight Checks
- Database connection verification
- Agent configuration check
- Table structure validation
- Backup directory permissions

### CSV Validation
- Required column verification
- Phone format checking
- Email format validation
- Row-by-row error reporting

### Backup System
- Automatic backup before migration
- Timestamped backup files
- JSON format for easy inspection
- Restore capability

### Dry Run Mode
- Test import without changes
- Preview data transformation
- Identify potential issues

## Troubleshooting

### Common Issues:

**Missing Required Columns:**
- Ensure CSV has `lead_name` and `phone` columns
- Column names are case-insensitive

**Hebrew Text Issues:**
- Save CSV as UTF-8
- Check text displays correctly in preview

**Phone Format Errors:**
- Remove special characters except: + - ( )
- Use standard Israeli format

**Database Connection Failed:**
- Check `.env.local` has correct credentials
- Verify Supabase service is running

## Current System Status

As of last check:
- **Total Leads:** 135
- **Backup Location:** `/backups/leads-backup-2026-01-09T13-48-29-191Z.json`
- **Agents Configured:** 8
  - Peleg (admin)
  - Leah (coordinator)
  - Yakir, Idan, Dor, Adi, Oriel, Reef (agents)

## Support

For issues or questions:
1. Check backup files in `/backups/`
2. Review error messages in console
3. Verify CSV format matches requirements
4. Test with small sample first