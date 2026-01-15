'use client'

import React, { useState } from 'react';
import { Lead, Agent } from '@/lib/database.types';
import { calculateAnalytics } from './analyticsUtils';
// Enhanced components only
import EnhancedWelcomeBanner from './EnhancedWelcomeBanner';
import { DateRange } from './DateRangePicker';
import EnhancedAgentLeaderboard from './EnhancedAgentLeaderboard';
import SourceEffectivenessChart from './SourceEffectivenessChart';
import ModernCompactStatusChart from './ModernCompactStatusChart';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * HomePage component props
 * Extracted from: FullDashboard_backup.tsx lines 348-836
 */
export interface HomePageProps {
  /** Database leads data */
  dbLeads: Lead[];
  /** Database agents data */
  dbAgents: Agent[];
  /** Currently selected time range */
  timeRange: string;
  /** Function to update the selected time range */
  setTimeRange: (range: string) => void;
  /** Current logged-in user */
  currentUser?: Agent | null;
  /** Optional CSS class name */
  className?: string;
  /** Data is still loading */
  loading?: boolean;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * HomePage Component
 *
 * PURPOSE: Renders the complete dashboard homepage with analytics and charts
 * EXTRACTED FROM: FullDashboard_backup.tsx lines 348-836
 * MOBILE-FIRST: Fully responsive design
 * FEATURES:
 * - TimeRangeFilter for period selection
 * - WelcomeBanner with KPI cards
 * - StatusDistributionChart with ring chart
 * - AgentsPerformanceRanking with colorful bars
 * - SourceDistributionChart with pie chart
 *
 * @param props HomePageProps
 * @returns JSX.Element
 */
export default function HomePage({
  dbLeads,
  dbAgents,
  timeRange,
  setTimeRange,
  currentUser,
  className = "",
  loading = false
}: HomePageProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Custom date range state for date picker
  const [customDateRange, setCustomDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    };
  });

  // ============================================================================
  // CALCULATE ANALYTICS DATA
  // ============================================================================

  // Filter agents to get only lead providers
  const leadProviders = dbAgents.filter(agent => agent.role === 'lead_supplier');

  // Calculate analytics based on current time range
  const analyticsData = calculateAnalytics(dbLeads, dbAgents, timeRange, leadProviders);

  const {
    totalLeads,
    analyticsLeads
  } = analyticsData;

  // ============================================================================
  // RENDER WITH LOADING STATE
  // ============================================================================

  // Show skeleton loader while data is loading
  if (loading || (dbLeads.length === 0 && dbAgents.length === 0)) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Page Title Skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-32"></div>
        </div>

        {/* Welcome Banner Skeleton */}
        <div className="animate-pulse bg-white rounded-2xl shadow-sm p-6">
          <div className="space-y-4">
            <div className="h-6 bg-slate-200 rounded w-48"></div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-sm p-6">
              <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
              <div className="h-48 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <h2 className="text-2xl font-bold text-slate-800">דשבורד</h2>
      </div>

      {/* Enhanced UI Components */}
      <div className="animate-fade-in-scale animation-delay-100">
        <EnhancedWelcomeBanner
          analyticsData={analyticsData}
          allLeads={dbLeads}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          currentUser={currentUser}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
        />
      </div>

      {/* Enhanced Analytics Charts - Conditional based on user role */}
      <div className={`grid grid-cols-1 ${currentUser?.role === 'agent' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 md:gap-6`}>
        {/* Modern Compact Status Chart with Donut - Always show */}
        <div className="animate-fade-in-up animation-delay-200 card-hover-lift">
          <ModernCompactStatusChart
            analyticsLeads={analyticsLeads}
            totalLeads={totalLeads}
            className=""
          />
        </div>

        {/* Enhanced Agent Leaderboard - Only show for non-agents */}
        {currentUser?.role !== 'agent' && (
          <div className="animate-fade-in-up animation-delay-300 card-hover-lift">
            <EnhancedAgentLeaderboard
              analyticsLeads={analyticsLeads}
              dbAgents={dbAgents}
              className=""
            />
          </div>
        )}

        {/* Source Effectiveness Chart - Only show for non-agents */}
        {currentUser?.role !== 'agent' && (
          <div className="animate-fade-in-up animation-delay-400 card-hover-lift">
            <SourceEffectivenessChart
              analyticsLeads={analyticsLeads}
              className=""
            />
          </div>
        )}
      </div>

      {/* Agent Leads Section - Show leads directly on homepage for agents */}
      {currentUser?.role === 'agent' && (
        <div className="animate-fade-in-up animation-delay-500">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>📋</span>
                הלידים שלי ({dbLeads.length})
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                כל הלידים שהוקצו לך ודורשים טיפול
              </p>
            </div>

            <div className="p-4 md:p-6">
              {dbLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-lg font-medium mb-2">אין לידים כרגע</p>
                  <p className="text-sm">לידים חדשים יופיעו כאן כשהם יוקצו לך</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbLeads.slice(0, 10).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{lead.lead_name}</h4>
                          <span className="text-sm text-gray-500">{lead.phone}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>📅 {new Date(lead.created_at).toLocaleDateString('he-IL')}</span>
                          {lead.meeting_date && (
                            <span>🕒 פגישה: {new Date(lead.meeting_date).toLocaleDateString('he-IL')}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lead.status === 'עסקה נסגרה' ? 'bg-green-100 text-green-700' :
                          lead.status === 'תואם' ? 'bg-blue-100 text-blue-700' :
                          lead.status === 'במעקב' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.status || 'ליד חדש'}
                        </div>
                      </div>
                    </div>
                  ))}

                  {dbLeads.length > 10 && (
                    <div className="text-center pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        מוצגים 10 מתוך {dbLeads.length} לידים
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}