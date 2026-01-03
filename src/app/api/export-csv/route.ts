import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

function escapeCSVField(field: string): string {
  if (!field) return '';

  // If field contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  } catch {
    return dateString || '';
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url);
    const filters: any = {};

    // Apply filters from query parameters
    if (searchParams.get('relevance_status')) {
      filters.relevance_status = searchParams.get('relevance_status');
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status');
    }
    if (searchParams.get('assigned_agent_id')) {
      filters.assigned_agent_id = searchParams.get('assigned_agent_id');
    }
    if (searchParams.get('source')) {
      filters.source = searchParams.get('source');
    }

    // Fetch leads with agent information
    const query = supabase
      .from('leads')
      .select(`
        *,
        agents:assigned_agent_id (
          name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        query.eq(key, value);
      }
    });

    const { data: leads, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // CSV Headers in Hebrew
    const headers = [
      'שם לקוח',
      'נייד',
      'אימייל',
      'מקור',
      'סטטוס רלוונטיות',
      'סטטוס ליד',
      'סוכן מטפל',
      'תאריך פגישה',
      'הערות סוכן',
      'תאריך יצירה',
      'תאריך עדכון'
    ];

    // Convert leads to CSV rows
    const csvRows = leads?.map(lead => [
      escapeCSVField(lead.lead_name || ''),
      escapeCSVField(lead.phone || ''),
      escapeCSVField(lead.email || ''),
      escapeCSVField(lead.source || ''),
      escapeCSVField(lead.relevance_status || ''),
      escapeCSVField(lead.status || ''),
      escapeCSVField(lead.agents?.name || ''),
      escapeCSVField(formatDate(lead.meeting_date)),
      escapeCSVField(lead.agent_notes || ''),
      escapeCSVField(formatDate(lead.created_at)),
      escapeCSVField(formatDate(lead.updated_at))
    ]) || [];

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for Hebrew support in Excel
    const bomCsvContent = '\ufeff' + csvContent;

    return new Response(bomCsvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({
      error: 'Failed to export CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}