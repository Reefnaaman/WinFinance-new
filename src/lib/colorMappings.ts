/**
 * Color mapping configuration for lead import system
 * Each color maps to a specific status and/or relevancy
 */

export interface ColorMapping {
  color: string;
  hebrewName: string;
  status: string | null;
  affectsRelevancy: boolean;
  relevanceStatus: string | null;
  priority: number;
  description: string;
}

export const COLOR_MAPPINGS: ColorMapping[] = [
  {
    color: 'green',
    hebrewName: 'ירוק',
    status: 'במעקב',
    affectsRelevancy: false,
    relevanceStatus: null,
    priority: 1,
    description: 'In follow-up'
  },
  {
    color: 'yellow',
    hebrewName: 'צהוב',
    status: 'תואם',
    affectsRelevancy: false,
    relevanceStatus: null,
    priority: 2,
    description: 'Meeting scheduled'
  },
  {
    color: 'orange',
    hebrewName: 'כתום',
    status: 'התקיימה - כשלון',
    affectsRelevancy: false,
    relevanceStatus: null,
    priority: 3,
    description: 'Meeting held - failure'
  },
  {
    color: 'white',
    hebrewName: 'לבן',
    status: 'אין מענה - לתאם מחדש',
    affectsRelevancy: false,
    relevanceStatus: null,
    priority: 4,
    description: 'No answer - reschedule'
  },
  {
    color: 'blue',
    hebrewName: 'כחול',
    status: 'עסקה נסגרה',
    affectsRelevancy: false,
    relevanceStatus: null,
    priority: 5,
    description: 'Deal closed'
  },
  {
    color: 'red',
    hebrewName: 'אדום',
    status: null, // Red does NOT set status
    affectsRelevancy: true, // Red ONLY affects relevancy
    relevanceStatus: 'לא רלוונטי',
    priority: 6,
    description: 'Not relevant - mark for exclusion'
  }
];

// Color aliases for flexible matching
export const COLOR_ALIASES: { [key: string]: string } = {
  // Hebrew shortcuts
  'ירו': 'ירוק',
  'אד': 'אדום',
  'צה': 'צהוב',
  'כח': 'כחול',
  'כת': 'כתום',
  'לב': 'לבן',
  // English names
  'green': 'ירוק',
  'red': 'אדום',
  'yellow': 'צהוב',
  'blue': 'כחול',
  'orange': 'כתום',
  'white': 'לבן'
};

/**
 * Normalize color code from various input formats
 */
export function normalizeColorCode(input: string | null): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Check if it's an alias
  if (COLOR_ALIASES[normalized]) {
    return COLOR_ALIASES[normalized];
  }

  // Check if any alias is contained in the input
  for (const [alias, fullColor] of Object.entries(COLOR_ALIASES)) {
    if (normalized.includes(alias)) {
      return fullColor;
    }
  }

  // Return as is if it's already a Hebrew color name
  const hebrewColors = COLOR_MAPPINGS.map(m => m.hebrewName);
  if (hebrewColors.includes(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * Get color mapping by color code
 */
export function getColorMapping(colorCode: string | null): ColorMapping | null {
  if (!colorCode) return null;

  const normalizedColor = normalizeColorCode(colorCode);
  if (!normalizedColor) return null;

  return COLOR_MAPPINGS.find(mapping =>
    mapping.hebrewName === normalizedColor
  ) || null;
}

/**
 * Apply color mapping to determine status
 * @param colorCode - The detected color
 * @param existingStatus - Current status (if any)
 * @returns The status to apply (or null if color doesn't affect status)
 */
export function applyColorToStatus(colorCode: string | null, existingStatus?: string | null): string | null {
  const mapping = getColorMapping(colorCode);

  // If color has a status mapping, use it
  if (mapping?.status) {
    return mapping.status;
  }

  // Otherwise keep existing status
  return existingStatus || null;
}

/**
 * Apply color mapping to determine relevancy
 * Note: 'אין מענה' in relevance_status is used by coordinators to track leads
 * that couldn't be reached, while 'אין מענה' in status is the actual lead status
 * @param colorCode - The detected color
 * @param existingRelevance - Current relevance status
 * @returns The relevance status to apply
 */
export function applyColorToRelevance(colorCode: string | null, existingRelevance?: string): string {
  const mapping = getColorMapping(colorCode);

  // Only apply if this color affects relevancy (red color)
  if (mapping?.affectsRelevancy && mapping.relevanceStatus) {
    return mapping.relevanceStatus;
  }

  // If we have a status from color, the lead is relevant (except red)
  if (mapping?.status) {
    return 'רלוונטי';
  }

  // Otherwise keep existing or default to pending review
  return existingRelevance || 'ממתין לבדיקה';
}

/**
 * Debug helper to log color detection
 */
export function debugColorDetection(input: string, detected: string | null): void {
  console.log(`Color detection: "${input}" → "${detected}"`);
  if (detected) {
    const mapping = getColorMapping(detected);
    if (mapping) {
      console.log(`  Status: ${mapping.status || 'N/A'}`);
      console.log(`  Relevancy: ${mapping.affectsRelevancy ? mapping.relevanceStatus : 'Not affected'}`);
    }
  }
}