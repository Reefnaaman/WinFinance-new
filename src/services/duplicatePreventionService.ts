import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface LeadData {
  lead_name: string;
  phone: string;
  email?: string;
}

// Type definitions for better TypeScript inference
type DuplicateResult = {
  success: false;
  duplicate: true;
  reason: string;
  existingLead?: any;
}

type SuccessResult = {
  success: true;
  duplicate: false;
  lead: any;
}

type ErrorResult = {
  success: false;
  duplicate: false;
  error: string;
}

type CreateLeadResult = DuplicateResult | SuccessResult | ErrorResult;

export class DuplicatePreventionService {
  private supabase = getSupabaseClient();

  /**
   * Check if a lead already exists using multiple criteria to prevent duplicates
   * This is BULLETPROOF duplicate detection
   */
  async isDuplicate(leadData: LeadData): Promise<{ isDuplicate: boolean; existingLead?: any; reason?: string }> {
    const { lead_name, phone, email } = leadData;

    // 1. EXACT phone match (primary check)
    const { data: phoneMatch } = await this.supabase
      .from('leads')
      .select('id, lead_name, phone, email, source, created_at')
      .eq('phone', phone)
      .single();

    if (phoneMatch) {
      return {
        isDuplicate: true,
        existingLead: phoneMatch,
        reason: 'exact_phone_match'
      };
    }

    // 2. EXACT name + similar phone (for typos in phone numbers)
    const normalizedName = lead_name.trim().toLowerCase();
    const { data: nameMatches } = await this.supabase
      .from('leads')
      .select('id, lead_name, phone, email, source, created_at')
      .ilike('lead_name', normalizedName);

    if (nameMatches && nameMatches.length > 0) {
      // Check for similar phone numbers
      for (const match of nameMatches) {
        if (this.phonesAreSimilar(phone, match.phone)) {
          return {
            isDuplicate: true,
            existingLead: match,
            reason: 'name_and_similar_phone'
          };
        }
      }
    }

    // 3. TIME-BASED check: Same name + same phone within last hour (prevents rapid duplicates)
    // FIXED: Only block if BOTH name AND phone match (not just name)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentNameMatches } = await this.supabase
      .from('leads')
      .select('id, lead_name, phone, email, source, created_at')
      .ilike('lead_name', normalizedName)
      .eq('phone', phone) // ADD THIS: Must match phone too!
      .gte('created_at', oneHourAgo);

    if (recentNameMatches && recentNameMatches.length > 0) {
      return {
        isDuplicate: true,
        existingLead: recentNameMatches[0],
        reason: 'same_name_and_phone_within_hour'
      };
    }

    // 4. EMAIL check (if email is provided)
    if (email && email.trim()) {
      const { data: emailMatch } = await this.supabase
        .from('leads')
        .select('id, lead_name, phone, email, source, created_at')
        .eq('email', email.trim())
        .single();

      if (emailMatch) {
        return {
          isDuplicate: true,
          existingLead: emailMatch,
          reason: 'exact_email_match'
        };
      }
    }

    // No duplicates found - safe to create
    return { isDuplicate: false };
  }

  /**
   * Check if two phone numbers are similar (accounting for typos/formatting)
   */
  private phonesAreSimilar(phone1: string, phone2: string): boolean {
    // Remove all non-digits
    const clean1 = phone1.replace(/\D/g, '');
    const clean2 = phone2.replace(/\D/g, '');

    // Must be same length
    if (clean1.length !== clean2.length) return false;

    // Check character differences
    let differences = 0;
    for (let i = 0; i < clean1.length; i++) {
      if (clean1[i] !== clean2[i]) differences++;
    }

    // Allow 1 character difference (typo tolerance)
    return differences <= 1;
  }

  /**
   * Create a new lead with duplicate prevention
   * Returns the created lead or existing duplicate
   */
  async createLeadSafely(leadData: LeadData, source: string = 'email', processedBy: string = 'webhook'): Promise<CreateLeadResult> {
    console.log(`🔍 Checking for duplicates: ${leadData.lead_name} (${leadData.phone})`);

    const duplicateCheck = await this.isDuplicate(leadData);

    if (duplicateCheck.isDuplicate) {
      console.log(`⚠️ Duplicate detected: ${duplicateCheck.reason}`, duplicateCheck.existingLead?.id);

      // Log duplicate detection (optional - for monitoring)
      await this.supabase
        .from('email_logs')
        .insert({
          email_from: processedBy,
          email_subject: `Duplicate prevented: ${leadData.lead_name} (${duplicateCheck.reason})`,
          processed_at: new Date().toISOString(),
          lead_created: false,
          raw_content: JSON.stringify({
            reason: duplicateCheck.reason,
            attempted_lead: leadData,
            existing_lead_id: duplicateCheck.existingLead?.id
          })
        });

      return {
        success: false,
        duplicate: true,
        reason: duplicateCheck.reason!,  // We know it exists when isDuplicate is true
        existingLead: duplicateCheck.existingLead
      } as DuplicateResult;
    }

    // Safe to create new lead
    console.log(`✅ Creating new lead: ${leadData.lead_name}`);

    const { data: newLead, error } = await this.supabase
      .from('leads')
      .insert({
        lead_name: leadData.lead_name,
        phone: leadData.phone,
        email: leadData.email || null,
        source: source.toLowerCase(), // Normalize source to lowercase
        relevance_status: 'ממתין לבדיקה',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating lead:', error);
      return {
        success: false,
        duplicate: false,
        error: error.message
      } as ErrorResult;
    }

    console.log(`✅ Lead created successfully: ID ${newLead.id}`);
    return {
      success: true,
      duplicate: false,
      lead: newLead
    } as SuccessResult;
  }
}