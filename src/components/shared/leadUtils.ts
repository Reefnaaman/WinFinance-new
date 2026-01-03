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
    if (field === 'assigned_agent_id' && value) {
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
            assigned_agent_id: value,
            status: 'תואם'
          })
          .eq('id', leadId);
        if (error) throw error;
        return;
      }
    }

    // Normal update for other fields
    const { error } = await supabase
      .from('leads')
      // @ts-ignore
      .update({ [field]: value })
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

export const getDateRange = (range: string) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'week':
      const weekAgo = new Date(startOfToday);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case 'month':
      const monthAgo = new Date(startOfToday);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
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