import { supabase } from '@/lib/supabase';
import { Lead, Agent } from '@/lib/database.types';

export const formatPhoneNumber = (phone: string) => {
  if (!phone) return phone;

  const digits = phone.replace(/[^0-9]/g, '');

  if (digits.length === 9 && !digits.startsWith('0')) {
    return '0' + digits.slice(0, 2) + '-' + digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.slice(0, 3) + '-' + digits.slice(3);
  }

  return phone;
};

export const updateLeadField = async (leadId: string, field: string, value: any): Promise<void> => {
  try {
    // Special handling for status field - no longer needed for line break issue
    // Status has been updated to 'התקיימה - כשלון'

    // Special handling for relevance status changes
    if (field === 'relevance_status') {
      // If changing to 'לא רלוונטי', also update status
      if (value === 'לא רלוונטי') {
        const { error } = await supabase
          .from('leads')
          // @ts-ignore
          .update({
            relevance_status: value,
            status: 'לא רלוונטי'
          })
          .eq('id', leadId);
        if (error) throw error;
        return;
      }
      // If changing to 'רלוונטי', check if agent is assigned
      if (value === 'רלוונטי') {
        // Get the current lead data
        // @ts-ignore
        const { data: lead } = await supabase
          .from('leads')
          .select('assigned_agent_id, status')
          .eq('id', leadId)
          .single();

        // If agent is assigned and status is 'ליד חדש', update to 'תואם'
        // @ts-ignore
        if (lead?.assigned_agent_id && lead?.status === 'ליד חדש') {
          const { error } = await supabase
            .from('leads')
            // @ts-ignore
            .update({
              relevance_status: value,
              status: 'תואם'
            })
            .eq('id', leadId);
          if (error) throw error;
          return;
        }
      }
    }

    // Special handling for agent assignment
    if (field === 'assigned_agent_id') {
      // Convert empty string to null for database
      const agentValue = value === '' ? null : value;

      // Only do special status handling if assigning an agent (not removing one)
      if (agentValue) {
        // Get the current lead data
        // @ts-ignore
        const { data: lead } = await supabase
          .from('leads')
          .select('relevance_status, status')
          .eq('id', leadId)
          .single();

        // If lead is relevant and status is 'ליד חדש', update to 'תואם'
        // @ts-ignore
        if (lead?.relevance_status === 'רלוונטי' && lead?.status === 'ליד חדש') {
          const { error } = await supabase
            .from('leads')
            // @ts-ignore
            .update({
              assigned_agent_id: agentValue,
              status: 'תואם'
            })
            .eq('id', leadId);
          if (error) throw error;
          return;
        }
      }

      // For all other cases (including unassigning), just update the agent
      const { error } = await supabase
        .from('leads')
        // @ts-ignore
        .update({ assigned_agent_id: agentValue })
        .eq('id', leadId);
      if (error) throw error;
      return;
    }

    // Special handling for price field - ensure it's a number
    let updateValue = value;
    if (field === 'price') {
      // Convert to number, default to 0 if invalid
      updateValue = value ? parseFloat(value) : 0;
      if (isNaN(updateValue)) updateValue = 0;
    }

    // Normal update for other fields
    const { error } = await supabase
      .from('leads')
      // @ts-ignore
      .update({ [field]: updateValue })
      .eq('id', leadId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating lead:', {
      field,
      value,
      leadId,
      errorMessage: error?.message || error,
      errorDetails: error
    });
    throw error;
  }
};

export const deleteLead = async (leadId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
};

export const getStatusInfo = (statusId: string | null, relevanceStatus?: string, statuses?: any[]) => {
  // Handle the new status 'התקיימה - כשלון'
  if (statusId === 'התקיימה - כשלון') {
    return {
      id: 'התקיימה - כשלון',
      label: 'התקיימה - כשלון',
      color: 'bg-red-500',
      lightBg: 'bg-red-50',
      text: 'text-red-700'
    };
  }

  if (!statusId) {
    // New leads default to 'ליד חדש'
    return { id: 'new_lead', label: 'ליד חדש', color: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700' };
  }

  return statuses?.find(s => s.id === statusId);
};

export const getAgentInfo = (agentId: string | null, agents: Agent[]) => {
  return agents.find(a => a.id === agentId);
};

export const getSourceInfo = (sourceId: string, sources: any[]) => {
  return sources.find(s => s.id === sourceId);
};

export interface DateRangeResult {
  startDate: Date;
  endDate?: Date;
}

export const getDateRange = (range: string, customStartDate?: Date, customEndDate?: Date): Date | null => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Handle custom date range
  if (range === 'custom' && customStartDate) {
    return customStartDate;
  }

  switch (range) {
    case 'week':
      const weekAgo = new Date(startOfToday);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case 'current_week':
      // From Sunday of current week (Israeli week starts on Sunday)
      const dayOfWeek = now.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
      const sunday = new Date(startOfToday);
      sunday.setDate(sunday.getDate() - daysToSunday);
      return sunday;
    case 'month':
      const monthAgo = new Date(startOfToday);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    case 'current_month':
      // From first day of current month to today
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'previous_month':
      // Full previous month (first day to last day)
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    case 'current_quarter':
      // Calculate current quarter start
      const currentQuarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), currentQuarter * 3, 1);
    case 'current_year':
      // From January 1st of current year to today
      return new Date(now.getFullYear(), 0, 1);
    case '3months':
      const threeMonthsAgo = new Date(startOfToday);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return threeMonthsAgo;
    case 'year':
      const yearAgo = new Date(startOfToday);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return yearAgo;
    default:
      return null;
  }
};

export const getDateRangeWithEnd = (range: string, customStartDate?: Date, customEndDate?: Date): DateRangeResult | null => {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Handle custom date range
  if (range === 'custom' && customStartDate && customEndDate) {
    return {
      startDate: customStartDate,
      endDate: customEndDate
    };
  }

  const startDate = getDateRange(range, customStartDate, customEndDate);
  if (!startDate) return null;

  switch (range) {
    case 'current_week':
      // Current week - from Sunday to Saturday (end of week)
      const dayOfWeek = now.getDay();
      const daysToSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
      const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSaturday, 23, 59, 59, 999);
      return {
        startDate,
        endDate: saturday < endOfToday ? saturday : endOfToday
      };
    case 'previous_month':
      // Full previous month - end on last day of that month
      const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate,
        endDate: lastDayOfPrevMonth
      };
    case 'current_quarter':
      // Current quarter - end today or end of quarter if quarter is complete
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterEndMonth = (currentQuarter + 1) * 3 - 1;
      const quarterEnd = new Date(now.getFullYear(), quarterEndMonth + 1, 0, 23, 59, 59, 999);
      return {
        startDate,
        endDate: quarterEnd < endOfToday ? quarterEnd : endOfToday
      };
    default:
      // All other ranges filter from start date to today
      return {
        startDate,
        endDate: endOfToday
      };
  }
};