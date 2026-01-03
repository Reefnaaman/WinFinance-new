'use client'

import React from 'react';
import { Lead, Agent } from '@/lib/database.types';
import { calculateAnalytics } from './analyticsUtils';
// Enhanced components only
import EnhancedWelcomeBanner from './EnhancedWelcomeBanner';
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
  className = ""
}: HomePageProps) {
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
  // RENDER
  // ============================================================================

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
        />
      </div>

      {/* Enhanced Analytics Charts - All in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Modern Compact Status Chart with Donut */}
        <div className="animate-fade-in-up animation-delay-200 card-hover-lift">
          <ModernCompactStatusChart
            analyticsLeads={analyticsLeads}
            totalLeads={totalLeads}
            className=""
          />
        </div>

        {/* Enhanced Agent Leaderboard - Narrower */}
        <div className="animate-fade-in-up animation-delay-300 card-hover-lift">
          <EnhancedAgentLeaderboard
            analyticsLeads={analyticsLeads}
            dbAgents={dbAgents}
            className=""
          />
        </div>

        {/* Source Effectiveness Chart - Compact */}
        <div className="animate-fade-in-up animation-delay-400 card-hover-lift">
          <SourceEffectivenessChart
            analyticsLeads={analyticsLeads}
            className=""
          />
        </div>
      </div>
    </div>
  );
}