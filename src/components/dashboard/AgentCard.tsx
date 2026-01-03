'use client'

import React from 'react';
import { AgentPerformanceData } from './analyticsUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * AgentCard component props
 * Extracted from: FullDashboard_backup.tsx lines 2164-2200
 */
export interface AgentCardProps {
  /** Agent performance data with statistics */
  agent: AgentPerformanceData;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * AgentCard Component
 *
 * PURPOSE: Renders an individual agent card with statistics and performance metrics
 * EXTRACTED FROM: FullDashboard_backup.tsx lines 2164-2200
 * MOBILE-FIRST: Responsive design with 2x2 grid on mobile, 4-column on larger screens
 * FEATURES:
 * - Agent avatar with gradient background
 * - Success rate percentage calculation and display
 * - Colorful statistics grid (matched, closed, in-progress, failed)
 * - Hover effects and clean modern design
 *
 * @param props AgentCardProps
 * @returns JSX.Element
 */
export default function AgentCard({
  agent,
  className = ""
}: AgentCardProps) {

  // ============================================================================
  // CALCULATE DERIVED VALUES
  // ============================================================================

  const { statusDistribution, successRate, totalLeads, closedLeads } = agent;

  // Map status distribution to display values (adjust naming if needed)
  const displayStats = {
    matched: statusDistribution.inProcess, // "תואם" - in process
    closed: statusDistribution.closed,      // "נסגר" - closed deals
    inProgress: statusDistribution.pending, // "בתהליך" - pending
    failed: statusDistribution.failed       // "נכשל" - failed
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all card-hover-lift ${className}`}>

      {/* Header: Agent Info and Success Rate */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br ${agent.color || 'from-blue-500 to-blue-600'} rounded-xl flex items-center justify-center text-white text-lg lg:text-xl shadow-lg`}>
              {agent.avatar || agent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base lg:text-lg font-bold text-slate-900">{agent.name}</h3>
              <p className="text-sm text-slate-700">{totalLeads} לידים</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-slate-900">{successRate}%</p>
            <p className="text-xs text-slate-700">אחוז הצלחה</p>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">

        {/* Matched/In-Process */}
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <p className="text-lg lg:text-xl font-bold text-emerald-600">{displayStats.matched}</p>
          <p className="text-xs text-emerald-600">תואם</p>
        </div>

        {/* Closed */}
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-lg lg:text-xl font-bold text-blue-600">{displayStats.closed}</p>
          <p className="text-xs text-blue-600">נסגר</p>
        </div>

        {/* In Progress/Pending */}
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <p className="text-lg lg:text-xl font-bold text-amber-600">{displayStats.inProgress}</p>
          <p className="text-xs text-amber-600">בתהליך</p>
        </div>

        {/* Failed */}
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-lg lg:text-xl font-bold text-red-600">{displayStats.failed}</p>
          <p className="text-xs text-red-600">נכשל</p>
        </div>

      </div>
    </div>
  );
}