import { NextRequest, NextResponse } from 'next/server';

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function detectColumnType(headerName: string): string {
  const clean = headerName.replace(/[:\s]/g, '').toLowerCase();

  if (clean.includes('נייד') || clean.includes('טלפון')) return 'phone';
  if (clean.includes('סטטוס') || clean.includes('סטאטוס')) return 'status';
  if (clean.includes('תאריך') || clean.includes('פגישה')) return 'meeting_date';
  if (clean.includes('שם') && clean.includes('לקוח')) return 'customer_name';
  if (clean.includes('סוכן') || clean.includes('מטפל')) return 'agent';
  if (clean.includes('אימייל') || clean.includes('email')) return 'email';
  if (clean.includes('מקור') || clean.includes('source')) return 'source';
  if (clean.includes('הערות') || clean.includes('notes')) return 'notes';
  if (clean.includes('צבע') || clean.includes('color')) return 'color_code';
  if (clean.includes('קטגוריה') || clean.includes('priority')) return 'priority';

  return 'unknown';
}

function analyzeColorCoding(data: string[][]): { [color: string]: number } {
  // Analyze the rightmost columns which might contain color information
  const colorDistribution: { [color: string]: number } = {};

  for (let i = 1; i < data.length; i++) { // Skip header
    const row = data[i];
    // Check last few columns for color indicators
    for (let j = row.length - 3; j < row.length; j++) {
      const cell = row[j]?.trim();
      if (cell && (
        cell.includes('ירוק') || cell.includes('אדום') || cell.includes('צהוב') ||
        cell.includes('כחול') || cell.includes('כתום') || cell.includes('סגול') ||
        cell.includes('ירו') || cell.includes('אד') || cell.includes('צה') ||
        cell.includes('ירו') || cell.includes('לבן')
      )) {
        colorDistribution[cell] = (colorDistribution[cell] || 0) + 1;
      }
    }
  }

  return colorDistribution;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    // Parse all data for analysis
    const allData = lines.map(line => parseCSVLine(line));

    // Parse first line (headers)
    const headerFields = allData[0];

    // Detect column types
    const columns = headerFields.map((header, index) => ({
      index,
      header: header.trim(),
      type: detectColumnType(header),
      isEmpty: header.trim() === '',
      sample: lines.length > 1 ? allData[1][index] || '' : ''
    }));

    // Analyze color coding
    const colorDistribution = analyzeColorCoding(allData);

    // Find required columns
    const phoneColumn = columns.find(col => col.type === 'phone');
    const statusColumn = columns.find(col => col.type === 'status');
    const customerColumn = columns.find(col => col.type === 'customer_name');
    const agentColumn = columns.find(col => col.type === 'agent');
    const meetingColumn = columns.find(col => col.type === 'meeting_date');
    const colorColumn = columns.find(col => col.type === 'color_code');

    // Generate mapping configuration
    const mapping = {
      phone: phoneColumn?.index,
      status: statusColumn?.index,
      customer_name: customerColumn?.index,
      agent: agentColumn?.index,
      meeting_date: meetingColumn?.index,
      color_code: colorColumn?.index
    };

    // Check if we have the required fields
    const hasRequired = phoneColumn && customerColumn;

    return NextResponse.json({
      totalLines: lines.length,
      headerLine: lines[0],
      columns,
      mapping,
      hasRequired,
      colorDistribution,
      recommendations: {
        phoneColumn: phoneColumn?.index ?? 'Not found',
        statusColumn: statusColumn?.index ?? 'Not found',
        customerColumn: customerColumn?.index ?? 'Not found',
        agentColumn: agentColumn?.index ?? 'Not found',
        meetingColumn: meetingColumn?.index ?? 'Not found',
        colorColumn: colorColumn?.index ?? 'Not found'
      },
      colorAnalysis: {
        hasColorCoding: Object.keys(colorDistribution).length > 0,
        colorCounts: colorDistribution,
        totalColoredRows: Object.values(colorDistribution).reduce((a, b) => a + b, 0)
      }
    });

  } catch (error) {
    console.error('Header detection error:', error);
    return NextResponse.json({
      error: 'Failed to analyze CSV headers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}