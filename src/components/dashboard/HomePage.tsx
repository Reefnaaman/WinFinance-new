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
import LeadsPage from '../leads/LeadsPage';

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

      {/* Agent Leads Section - Full editable table for agents */}
      {currentUser?.role === 'agent' && (
        <div className="animate-fade-in-up animation-delay-500">
          <LeadsPage
            filteredLeads={dbLeads.filter(lead => lead.assigned_agent_id === currentUser.id)}
            dbAgents={dbAgents}
            sources={[
              { id: 'Email', label: 'אימייל', color: 'bg-blue-500', icon: '📧', lightBg: 'bg-blue-50', text: 'text-blue-700' },
              { id: 'Google Sheet', label: 'גוגל שיטס', color: 'bg-green-500', icon: '📊', lightBg: 'bg-green-50', text: 'text-green-700' },
              { id: 'Manual', label: 'ידני', color: 'bg-purple-500', icon: '✍️', lightBg: 'bg-purple-50', text: 'text-purple-700' },
              { id: 'Other', label: 'אחר', color: 'bg-gray-500', icon: '📌', lightBg: 'bg-gray-50', text: 'text-gray-700' }
            ]}
            statuses={[
              { id: 'ליד חדש', label: 'ליד חדש', color: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700' },
              { id: 'אין מענה - לתאם מחדש', label: 'אין מענה', color: 'bg-yellow-500', lightBg: 'bg-yellow-50', text: 'text-yellow-700' },
              { id: 'תואם', label: 'תואם', color: 'bg-blue-500', lightBg: 'bg-blue-50', text: 'text-blue-700' },
              { id: 'במעקב', label: 'במעקב', color: 'bg-purple-500', lightBg: 'bg-purple-50', text: 'text-purple-700' },
              { id: 'עסקה נסגרה', label: 'עסקה נסגרה', color: 'bg-green-500', lightBg: 'bg-green-50', text: 'text-green-700' },
              { id: 'התקיימה - כשלון', label: 'התקיימה - כשלון', color: 'bg-red-500', lightBg: 'bg-red-50', text: 'text-red-700' },
              { id: 'לא רלוונטי', label: 'לא רלוונטי', color: 'bg-gray-500', lightBg: 'bg-gray-50', text: 'text-gray-700' }
            ]}
            relevanceStatuses={[
              { id: 'ממתין לבדיקה', label: 'ממתין לבדיקה', color: 'bg-yellow-500', lightBg: 'bg-yellow-50', text: 'text-yellow-700' },
              { id: 'רלוונטי', label: 'רלוונטי', color: 'bg-green-500', lightBg: 'bg-green-50', text: 'text-green-700' },
              { id: 'לא רלוונטי', label: 'לא רלוונטי', color: 'bg-gray-500', lightBg: 'bg-gray-50', text: 'text-gray-700' }
            ]}
            activeAgent="all"
            setActiveAgent={() => {}}
            activeStatus="all"
            setActiveStatus={() => {}}
            activeSource="all"
            setActiveSource={() => {}}
            activeRelevance="all"
            setActiveRelevance={() => {}}
            searchTerm=""
            setSearchTerm={() => {}}
            sortBy="date"
            setSortBy={() => {}}
            sortOrder="desc"
            setSortOrder={() => {}}
            fetchData={async () => {}}
            canCreateLeads={() => false}
            filterCounts={{
              agents: {},
              statuses: {},
              sources: {},
              relevance: {}
            }}
            swipedCard={null}
            setSwipedCard={() => {}}
            swipeStart={null}
            setSwipeStart={() => {}}
            isRefreshing={false}
            pullDistance={0}
            handleRefresh={async () => {}}
            setPullDistance={() => {}}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            customDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
          />
        </div>
      )}
    </div>
  );
}