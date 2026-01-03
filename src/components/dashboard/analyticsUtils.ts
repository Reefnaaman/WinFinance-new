import { Lead, Agent } from '@/lib/database.types';
import { getDateRange } from '../shared/leadUtils';

export interface AnalyticsData {
  totalLeads: number;
  matchedLeads: number;
  closedLeads: number;
  failedLeads: number;
  pendingAssignment: number;
  emailLeads: number;
  supplierLeads: number;
  totalRevenue: number;
  analyticsLeads: Lead[];
}

export interface AgentPerformanceData extends Agent {
  totalLeads: number;
  closedLeads: number;
  statusDistribution: {
    pending: number;
    inProcess: number;
    failed: number;
    closed: number;
  };
  successRate: number;
  color?: string;
  avatar?: string;
}

export interface StatusData {
  id: string;
  label: string;
  count: number;
  color: string;
  percentage: number;
  barWidth: number;
}

export interface SourceData {
  id: string;
  label: string;
  count: number;
  color: string;
  percentage: number;
  barWidth: number;
}

export const calculateAnalytics = (
  dbLeads: Lead[],
  dbAgents: Agent[],
  timeRange: string,
  leadProviders: Agent[]
): AnalyticsData => {
  // Filter leads for analytics based on time range
  const analyticsFilterDate = getDateRange(timeRange);
  const analyticsLeads = analyticsFilterDate
    ? dbLeads.filter(lead => new Date(lead.created_at) >= analyticsFilterDate)
    : dbLeads;

  // Basic metrics
  const totalLeads = analyticsLeads.length;
  const matchedLeads = analyticsLeads.filter(l => l.status === 'תואם').length;
  const closedLeads = analyticsLeads.filter(l => l.status === 'עסקה נסגרה').length;
  const failedLeads = analyticsLeads.filter(l => l.status === 'התקיימה - כשלון').length;
  const pendingAssignment = analyticsLeads.filter(l => !l.assigned_agent_id).length;
  const emailLeads = analyticsLeads.filter(l => l.source === 'Email').length;

  // Calculate leads from all lead providers (dynamic)
  const leadProviderNames = leadProviders.map(p => p.name);
  const supplierLeads = analyticsLeads.filter(l =>
    leadProviderNames.includes(l.source)
  ).length;

  // Calculate total revenue
  const totalRevenue = analyticsLeads
    .filter(l => l.status === 'עסקה נסגרה' && l.price && !isNaN(Number(l.price)))
    .reduce((sum, lead) => sum + Number(lead.price), 0);

  return {
    totalLeads,
    matchedLeads,
    closedLeads,
    failedLeads,
    pendingAssignment,
    emailLeads,
    supplierLeads,
    totalRevenue,
    analyticsLeads
  };
};

export const calculateAgentPerformance = (
  analyticsLeads: Lead[],
  dbAgents: Agent[]
): AgentPerformanceData[] => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-rose-500 to-rose-600',
    'from-amber-500 to-amber-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600'
  ];

  return dbAgents
    .filter((agent, index, self) => index === self.findIndex((a) => a.id === agent.id)) // Remove duplicates
    .filter(a => a.role === 'agent') // Only agents in ranking
    .map((agent, index) => {
      const agentLeads = analyticsLeads.filter(l => l.assigned_agent_id === agent.id);
      const agentClosedLeads = agentLeads.filter(lead => lead.status === 'עסקה נסגרה');
      const totalAgentLeads = agentLeads.length;

      // Calculate status distribution for colorful bars
      const pending = agentLeads.filter(l => !l.status || l.status === 'ליד חדש').length;
      const inProcess = agentLeads.filter(l =>
        l.status === 'תואם' ||
        l.status === 'במעקב' ||
        l.status === 'אין מענה - לתאם מחדש'
      ).length;
      const failed = agentLeads.filter(l =>
        l.status === 'התקיימה - כשלון'
      ).length;
      const closed = agentClosedLeads.length;

      return {
        ...agent,
        totalLeads: totalAgentLeads,
        closedLeads: closed,
        statusDistribution: { pending, inProcess, failed, closed },
        successRate: totalAgentLeads > 0 ? Math.round((closed / totalAgentLeads) * 100) : 0,
        color: colors[index % colors.length],
        avatar: agent.name.charAt(0).toUpperCase()
      };
    })
    .sort((a, b) => b.closedLeads - a.closedLeads);
};

export const calculateStatusDistribution = (analyticsLeads: Lead[], totalLeads: number): StatusData[] => {
  // Calculate actual status counts based on real lead statuses
  // Use analyticsLeads.length as the actual total to ensure consistency
  const actualTotal = analyticsLeads.length;

  const newLeads = analyticsLeads.filter(l =>
    (l.status === 'ליד חדש' || !l.status) && l.relevance_status !== 'לא רלוונטי'
  ).length;
  const scheduled = analyticsLeads.filter(l => l.status === 'תואם').length;
  const noAnswerRetry = analyticsLeads.filter(l => l.status === 'אין מענה - לתאם מחדש').length;
  const meetingFailed = analyticsLeads.filter(l => l.status === 'התקיימה - כשלון').length;
  const meetingSigned = analyticsLeads.filter(l => l.status === 'עסקה נסגרה').length;
  const meetingFollowUp = analyticsLeads.filter(l => l.status === 'במעקב').length;
  const notRelevant = analyticsLeads.filter(l => l.relevance_status === 'לא רלוונטי').length;

  const statusData = [
    { id: 'new_leads', label: 'ליד חדש', count: newLeads, color: 'bg-yellow-500' },
    { id: 'scheduled', label: 'תואם', count: scheduled, color: 'bg-purple-500' },
    { id: 'no_answer_retry', label: 'אין מענה - לתאם מחדש', count: noAnswerRetry, color: 'bg-orange-500' },
    { id: 'meeting_failed', label: 'התקיימה - כשלון', count: meetingFailed, color: 'bg-red-500' },
    { id: 'meeting_signed', label: 'עסקה נסגרה', count: meetingSigned, color: 'bg-green-500' },
    { id: 'meeting_followup', label: 'במעקב', count: meetingFollowUp, color: 'bg-blue-500' },
    { id: 'not_relevant', label: 'לא רלוונטי', count: notRelevant, color: 'bg-gray-500' },
  ].filter(status => status.count > 0);

  const maxCount = Math.max(...statusData.map(s => s.count), 1);

  return statusData.map(status => ({
    ...status,
    percentage: actualTotal > 0 ? Math.round((status.count / actualTotal) * 100) : 0,
    barWidth: (status.count / maxCount) * 100
  }));
};

export const calculateSourceDistribution = (analyticsLeads: Lead[], totalLeads: number): SourceData[] => {
  if (!analyticsLeads || analyticsLeads.length === 0) return [];

  // Count leads by actual source
  const sourceCounts: Record<string, number> = {};
  analyticsLeads.forEach(lead => {
    const source = lead.source || 'Manual';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  // Convert to array and assign colors
  const colorMap: Record<string, string> = {
    'Email': 'bg-blue-500',
    'Manual': 'bg-purple-500',
    'Google Sheet': 'bg-green-500',
    'Other': 'bg-gray-500'
  };

  // Default color for lead suppliers
  const leadSupplierColors = ['bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];
  let colorIndex = 0;

  const sources = Object.entries(sourceCounts).map(([source, count]) => {
    let color = colorMap[source];
    if (!color) {
      // This is a lead supplier name
      color = leadSupplierColors[colorIndex % leadSupplierColors.length];
      colorIndex++;
    }

    return {
      id: source,
      label: source === 'Manual' ? 'ידני' : source,
      count,
      color
    };
  }).filter(source => source.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...sources.map(s => s.count), 1);

  return sources.map(source => ({
    ...source,
    percentage: totalLeads > 0 ? Math.round((source.count / totalLeads) * 100) : 0,
    barWidth: (source.count / maxCount) * 100
  }));
};

// ============================================================================
// NEW ENHANCED ANALYTICS FUNCTIONS - Added for 2025 Dashboard
// ============================================================================

export interface MonthOverMonthData {
  currentMonth: {
    revenue: number;
    closedDeals: number;
    totalLeads: number;
    conversionRate: number;
  };
  previousMonth: {
    revenue: number;
    closedDeals: number;
    totalLeads: number;
    conversionRate: number;
  };
  changes: {
    revenueChange: number;
    revenueChangePercent: number;
    dealsChange: number;
    dealsChangePercent: number;
    leadsChange: number;
    leadsChangePercent: number;
    conversionChange: number;
  };
}

export const calculateMonthOverMonth = (allLeads: Lead[]): MonthOverMonthData => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Current month leads
  const currentMonthLeads = allLeads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    return leadDate >= currentMonthStart;
  });

  // Previous month leads
  const previousMonthLeads = allLeads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    return leadDate >= previousMonthStart && leadDate <= previousMonthEnd;
  });

  // Calculate metrics for current month
  const currentClosedDeals = currentMonthLeads.filter(l => l.status === 'עסקה נסגרה');
  const currentRevenue = currentClosedDeals
    .filter(l => l.price && !isNaN(Number(l.price)))
    .reduce((sum, lead) => sum + Number(lead.price), 0);
  const currentConversion = currentMonthLeads.length > 0
    ? (currentClosedDeals.length / currentMonthLeads.length) * 100
    : 0;

  // Calculate metrics for previous month
  const previousClosedDeals = previousMonthLeads.filter(l => l.status === 'עסקה נסגרה');
  const previousRevenue = previousClosedDeals
    .filter(l => l.price && !isNaN(Number(l.price)))
    .reduce((sum, lead) => sum + Number(lead.price), 0);
  const previousConversion = previousMonthLeads.length > 0
    ? (previousClosedDeals.length / previousMonthLeads.length) * 100
    : 0;

  // Calculate changes
  const revenueChange = currentRevenue - previousRevenue;
  const revenueChangePercent = previousRevenue > 0
    ? ((revenueChange / previousRevenue) * 100)
    : currentRevenue > 0 ? 100 : 0;

  const dealsChange = currentClosedDeals.length - previousClosedDeals.length;
  const dealsChangePercent = previousClosedDeals.length > 0
    ? ((dealsChange / previousClosedDeals.length) * 100)
    : currentClosedDeals.length > 0 ? 100 : 0;

  const leadsChange = currentMonthLeads.length - previousMonthLeads.length;
  const leadsChangePercent = previousMonthLeads.length > 0
    ? ((leadsChange / previousMonthLeads.length) * 100)
    : currentMonthLeads.length > 0 ? 100 : 0;

  return {
    currentMonth: {
      revenue: currentRevenue,
      closedDeals: currentClosedDeals.length,
      totalLeads: currentMonthLeads.length,
      conversionRate: currentConversion
    },
    previousMonth: {
      revenue: previousRevenue,
      closedDeals: previousClosedDeals.length,
      totalLeads: previousMonthLeads.length,
      conversionRate: previousConversion
    },
    changes: {
      revenueChange,
      revenueChangePercent,
      dealsChange,
      dealsChangePercent,
      leadsChange,
      leadsChangePercent,
      conversionChange: currentConversion - previousConversion
    }
  };
};

export interface AgentRevenueData extends Agent {
  totalRevenue: number;
  closedDeals: number;
  averageDealSize: number;
  conversionRate: number;
  totalLeads: number;
  rank?: number;
}

export const calculateAgentRevenue = (leads: Lead[], agents: Agent[]): AgentRevenueData[] => {
  return agents
    .filter(a => a.role === 'agent')
    .map(agent => {
      const agentLeads = leads.filter(l => l.assigned_agent_id === agent.id);
      const closedDeals = agentLeads.filter(l => l.status === 'עסקה נסגרה');

      const totalRevenue = closedDeals
        .filter(l => l.price && !isNaN(Number(l.price)))
        .reduce((sum, lead) => sum + Number(lead.price), 0);

      const averageDealSize = closedDeals.length > 0
        ? totalRevenue / closedDeals.length
        : 0;

      const conversionRate = agentLeads.length > 0
        ? (closedDeals.length / agentLeads.length) * 100
        : 0;

      return {
        ...agent,
        totalRevenue,
        closedDeals: closedDeals.length,
        averageDealSize,
        conversionRate,
        totalLeads: agentLeads.length
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((agent, index) => ({ ...agent, rank: index + 1 }));
};

export interface SourceEffectivenessData {
  source: string;
  label: string;
  totalLeads: number;
  closedDeals: number;
  revenue: number;
  conversionRate: number;
  averageDealSize: number;
  roi?: number; // If we track lead costs later
  color: string;
}

export const calculateSourceEffectiveness = (leads: Lead[]): SourceEffectivenessData[] => {
  // Dynamically get all unique sources from leads
  const uniqueSources = [...new Set(leads.map(l => l.source).filter(Boolean))];

  // Define colors for known sources and lead suppliers
  const colors: { [key: string]: string } = {
    'Email': 'from-blue-400/20 to-blue-600/30',
    'Manual': 'from-purple-400/20 to-purple-600/30',
    'Google Sheet': 'from-amber-400/20 to-amber-600/30',
    'Other': 'from-gray-400/20 to-gray-600/30'
  };

  // Additional colors for lead suppliers
  const supplierColors = [
    'from-rose-400/20 to-rose-600/30',
    'from-teal-400/20 to-teal-600/30',
    'from-indigo-400/20 to-indigo-600/30',
    'from-emerald-400/20 to-emerald-600/30'
  ];
  let colorIndex = 0;

  return uniqueSources.map(source => {
    // Filter leads by their actual source
    const sourceLeads = leads.filter(l => l.source === source);

    const closedDeals = sourceLeads.filter(l => l.status === 'עסקה נסגרה');

    const revenue = closedDeals
      .filter(l => l.price && !isNaN(Number(l.price)))
      .reduce((sum, lead) => sum + Number(lead.price), 0);

    const conversionRate = sourceLeads.length > 0
      ? (closedDeals.length / sourceLeads.length) * 100
      : 0;

    const averageDealSize = closedDeals.length > 0
      ? revenue / closedDeals.length
      : 0;

    // Get color - use predefined for known sources, cycle through supplier colors for lead suppliers
    let color = colors[source];
    if (!color) {
      // This is a lead supplier
      color = supplierColors[colorIndex % supplierColors.length];
      colorIndex++;
    }

    return {
      source,
      label: source === 'Manual' ? 'ידני' : source,
      totalLeads: sourceLeads.length,
      closedDeals: closedDeals.length,
      revenue,
      conversionRate,
      averageDealSize,
      color
    };
  }).filter(s => s.totalLeads > 0)
    .sort((a, b) => b.revenue - a.revenue);
};