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