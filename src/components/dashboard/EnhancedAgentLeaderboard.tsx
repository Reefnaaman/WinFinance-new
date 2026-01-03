'use client'

import React from 'react';
import { Trophy, TrendingUp, DollarSign, Target } from 'lucide-react';
import { Lead, Agent } from '@/lib/database.types';
import { calculateAgentPerformance, AgentPerformanceData } from './analyticsUtils';

// ============================================================================
// ENHANCED AGENT LEADERBOARD - 2025 Design
// ============================================================================

export interface EnhancedAgentLeaderboardProps {
  analyticsLeads: Lead[];
  dbAgents: Agent[];
  className?: string;
}

/**
 * EnhancedAgentLeaderboard Component
 *
 * Modern agent performance ranking with revenue focus
 * Features:
 * - Revenue-based ranking
 * - Glassmorphic cards
 * - Progress bars with gradients
 * - Mobile-responsive horizontal scroll
 * - Top performer highlighting
 */
export default function EnhancedAgentLeaderboard({
  analyticsLeads,
  dbAgents,
  className = ''
}: EnhancedAgentLeaderboardProps) {
  // Calculate agent performance data with status distribution
  const agentData = calculateAgentPerformance(analyticsLeads, dbAgents);

  // Calculate revenue for each agent manually
  const agentsWithRevenue = agentData.map((agent, index) => {
    const agentLeads = analyticsLeads.filter(l => l.assigned_agent_id === agent.id);
    const closedDeals = agentLeads.filter(l => l.status === 'עסקה נסגרה');
    const totalRevenue = closedDeals
      .filter(l => l.price && !isNaN(Number(l.price)))
      .reduce((sum, lead) => sum + Number(lead.price), 0);
    const conversionRate = agentLeads.length > 0
      ? (closedDeals.length / agentLeads.length) * 100
      : 0;

    return {
      ...agent,
      totalRevenue,
      closedDeals: closedDeals.length,
      conversionRate,
      rank: index + 1
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Get top 5 agents only
  const topAgents = agentsWithRevenue.slice(0, 5);

  // Find max revenue for scaling progress bars
  const maxRevenue = Math.max(...topAgents.map(a => a.totalRevenue), 1);

  // Medal colors for top 3
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-amber-500'; // Gold
      case 2:
        return 'from-gray-300 to-gray-400'; // Silver
      case 3:
        return 'from-orange-400 to-orange-600'; // Bronze
      default:
        return '';
    }
  };

  // Progress bar gradient based on performance
  const getProgressGradient = (agent: any) => {
    if (agent.conversionRate >= 20) {
      return 'from-emerald-400 to-emerald-600';
    } else if (agent.conversionRate >= 10) {
      return 'from-blue-400 to-blue-600';
    } else if (agent.conversionRate >= 5) {
      return 'from-amber-400 to-amber-600';
    } else {
      return 'from-rose-400 to-rose-600';
    }
  };

  return (
    <div
      className={`
        relative
        bg-white/90 backdrop-blur-xl
        border border-gray-200
        rounded-2xl
        p-4
        shadow-xl
        transition-all duration-300
        ${className}
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white/30 rounded-2xl" />

      <div className="relative z-10">
      {/* Compact Header with Total */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            מעקב סוכנים
          </h3>
          <p className="text-xs text-gray-500">
            דירוג לפי הכנסות
          </p>
        </div>
        <Trophy className="w-5 h-5 text-yellow-500" />
      </div>

      {/* Status Color Legend */}
      <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full" />
            <span className="text-gray-600">ממתין</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded-full" />
            <span className="text-gray-600">בתהליך</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 rounded-full" />
            <span className="text-gray-600">נכשל</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <span className="text-gray-600">נסגר</span>
          </div>
        </div>
      </div>

      {/* Compact Agent List */}
      <div className="space-y-3">
        {topAgents.map((agent) => (
          <div
            key={agent.id}
            className={`
              relative
              rounded-xl
              p-3
              transition-all duration-300
              hover:scale-[1.01]
              shadow-sm hover:shadow-md
              ${agent.rank === 1 ? 'bg-gradient-to-br from-yellow-50/30 to-amber-50/30 border border-yellow-400/60' :
                agent.rank === 2 ? 'bg-gradient-to-br from-slate-50/30 to-silver-50/30 border border-slate-400/60' :
                agent.rank === 3 ? 'bg-gradient-to-br from-orange-50/30 to-amber-50/30 border border-orange-400/60' :
                'bg-white border border-gray-200/50'}
            `}
          >
            {/* Compact rank indicator */}
            {agent.rank && agent.rank <= 3 && (
              <div
                className={`
                  absolute -top-1 -right-1
                  w-6 h-6
                  bg-gradient-to-br ${getMedalColor(agent.rank)}
                  rounded-full
                  flex items-center justify-center
                  text-white font-bold text-xs
                  shadow-sm
                `}
              >
                {agent.rank}
              </div>
            )}

            {/* Agent info - all in one row */}
            <div className="flex items-center justify-between mb-2">
              {/* Left side - Name only */}
              <div className="flex items-center gap-2">
                {/* Name only - bigger */}
                <p className="font-bold text-gray-900 text-xl">
                  {agent.name}
                </p>
              </div>

              {/* Right side - All metrics in one row with dividers */}
              <div className="flex items-center">
                {/* Total Leads */}
                <div className="relative text-center px-3">
                  {/* Glassmorphic cube background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-blue-200/20 backdrop-blur-sm rounded-lg border border-blue-200/30 shadow-sm" />
                  <div className="relative z-10">
                    <p className="text-base font-bold text-black">{agent.totalLeads}</p>
                    <p className="text-[10px] text-gray-600">לידים</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-gray-200 mx-1" />

                {/* Deals */}
                <div className="relative text-center px-3">
                  {/* Glassmorphic cube background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/40 to-emerald-200/20 backdrop-blur-sm rounded-lg border border-emerald-200/30 shadow-sm" />
                  <div className="relative z-10">
                    <p className="text-base font-bold text-black">{agent.closedDeals}</p>
                    <p className="text-[10px] text-gray-600">עסקאות</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-gray-200 mx-1" />

                {/* Conversion Rate */}
                <div className="relative text-center px-3">
                  {/* Glassmorphic cube background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100/40 to-purple-200/20 backdrop-blur-sm rounded-lg border border-purple-200/30 shadow-sm" />
                  <div className="relative z-10">
                    <p className="text-base font-bold text-black">{agent.conversionRate.toFixed(0)}%</p>
                    <p className="text-[10px] text-gray-600">המרה</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-gray-200 mx-1" />

                {/* Revenue */}
                <div className="relative text-center px-3 min-w-[70px]">
                  {/* Glassmorphic cube background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-amber-200/20 backdrop-blur-sm rounded-lg border border-amber-200/30 shadow-sm" />
                  <div className="relative z-10">
                    <p className="text-base font-bold text-gray-900">
                      {agent.totalRevenue >= 1000
                        ? `${(agent.totalRevenue / 1000).toFixed(0)}k₪`
                        : `${agent.totalRevenue}₪`}
                    </p>
                    <p className="text-[10px] text-gray-600">הכנסות</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue progress bar - moved up */}
            <div className="h-2 bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm mb-2">
              <div
                className={`
                  h-full
                  bg-gradient-to-r ${
                    agent.conversionRate >= 15
                      ? 'from-emerald-400 to-emerald-600'
                      : agent.conversionRate >= 10
                      ? 'from-blue-400 to-blue-600'
                      : 'from-amber-400 to-amber-600'
                  }
                  rounded-full
                  transition-all duration-1000 ease-out
                  shadow-sm
                `}
                style={{
                  width: `${(agent.totalRevenue / maxRevenue) * 100}%`
                }}
              />
            </div>

            {/* Status breakdown color map - below bar */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2">
                {/* Pending - Yellow */}
                <div className="flex items-center gap-1 flex-1">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-sm" />
                  <span className="text-xs font-bold text-gray-700">{agent.statusDistribution.pending || 0}</span>
                </div>

                {/* In Process - Blue */}
                <div className="flex items-center gap-1 flex-1">
                  <div className="w-3 h-3 bg-blue-400 rounded-full shadow-sm" />
                  <span className="text-xs font-bold text-gray-700">{agent.statusDistribution.inProcess || 0}</span>
                </div>

                {/* Failed - Red */}
                <div className="flex items-center gap-1 flex-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full shadow-sm" />
                  <span className="text-xs font-bold text-gray-700">{agent.statusDistribution.failed || 0}</span>
                </div>

                {/* Closed - Green */}
                <div className="flex items-center gap-1 flex-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full shadow-sm" />
                  <span className="text-xs font-bold text-gray-700">{agent.statusDistribution.closed || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}