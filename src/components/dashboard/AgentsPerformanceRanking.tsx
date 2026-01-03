'use client'

import React from 'react';
import { AgentPerformanceData, calculateAgentPerformance } from './analyticsUtils';
import { Lead, Agent } from '@/lib/database.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * AgentsPerformanceRanking component props
 */
export interface AgentsPerformanceRankingProps {
  /** Analytics leads data for calculations */
  analyticsLeads: Lead[];
  /** Database agents for ranking */
  dbAgents: Agent[];
  /** Maximum number of agents to display (default: 5) */
  maxAgents?: number;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * AgentsPerformanceRanking Component
 *
 * PURPOSE: Modern, clean agent performance ranking
 * FEATURES:
 * - Clean minimal design
 * - Clear metrics hierarchy
 * - Subtle visual indicators
 * - Mobile responsive
 *
 * @param props AgentsPerformanceRankingProps
 * @returns JSX.Element
 */
export default function AgentsPerformanceRanking({
  analyticsLeads,
  dbAgents,
  maxAgents = 5,
  className = ""
}: AgentsPerformanceRankingProps) {

  // ============================================================================
  // CALCULATE AGENT PERFORMANCE DATA
  // ============================================================================

  const agentPerformanceData = calculateAgentPerformance(analyticsLeads, dbAgents)
    .slice(0, maxAgents);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getSuccessRate = (agent: AgentPerformanceData) => {
    if (agent.totalLeads === 0) return 0;
    return Math.round((agent.statusDistribution.closed / agent.totalLeads) * 100);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`xl:col-span-4 ${className}`}>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">

        {/* Clean Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">דירוג סוכנים</h3>
          <p className="text-sm text-gray-500 mt-1">ביצועים לפי עסקאות שנסגרו</p>
        </div>

        <div className="space-y-3">
          {agentPerformanceData.map((agent, index) => {
            const successRate = getSuccessRate(agent);
            const rank = index + 1;

            return (
              <div key={agent.id} className="group">
                <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">

                  {/* Main Content */}
                  <div className="flex items-center justify-between">

                    {/* Left: Rank & Agent Info */}
                    <div className="flex items-center gap-4">
                      {/* Rank Badge */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                          rank === 2 ? 'bg-gray-100 text-gray-700' :
                          rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600'}
                      `}>
                        {rank}
                      </div>

                      {/* Agent Name & Stats */}
                      <div>
                        <div className="font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-500">
                          {agent.totalLeads} לידים
                        </div>
                      </div>
                    </div>

                    {/* Right: Key Metrics */}
                    <div className="flex items-center gap-6">
                      {/* Success Rate - Desktop only */}
                      <div className="hidden md:block text-center">
                        <div className={`text-xl font-semibold
                          ${successRate >= 70 ? 'text-green-600' :
                            successRate >= 40 ? 'text-yellow-600' :
                            'text-gray-600'}
                        `}>
                          {successRate}%
                        </div>
                        <div className="text-xs text-gray-500">הצלחה</div>
                      </div>

                      {/* Closed Deals */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {agent.statusDistribution.closed}
                        </div>
                        <div className="text-xs text-gray-500">נסגרו</div>
                      </div>
                    </div>
                  </div>

                  {/* Status Bar - Subtle visual indicator */}
                  {agent.totalLeads > 0 && (
                    <div className="mt-3">
                      <div className="flex w-full h-1 rounded-full overflow-hidden bg-gray-100">
                        {agent.statusDistribution.closed > 0 && (
                          <div
                            className="bg-green-500"
                            style={{ width: `${(agent.statusDistribution.closed / agent.totalLeads) * 100}%` }}
                          />
                        )}
                        {agent.statusDistribution.inProcess > 0 && (
                          <div
                            className="bg-blue-500"
                            style={{ width: `${(agent.statusDistribution.inProcess / agent.totalLeads) * 100}%` }}
                          />
                        )}
                        {agent.statusDistribution.pending > 0 && (
                          <div
                            className="bg-yellow-500"
                            style={{ width: `${(agent.statusDistribution.pending / agent.totalLeads) * 100}%` }}
                          />
                        )}
                        {agent.statusDistribution.failed > 0 && (
                          <div
                            className="bg-gray-400"
                            style={{ width: `${(agent.statusDistribution.failed / agent.totalLeads) * 100}%` }}
                          />
                        )}
                      </div>

                      {/* Mobile: Show success rate */}
                      <div className="md:hidden mt-2 flex justify-between text-xs text-gray-500">
                        <span>{successRate}% הצלחה</span>
                        <span>{agent.statusDistribution.inProcess} בתהליך</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty States */}
          {dbAgents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">אין סוכנים במערכת</p>
            </div>
          )}

          {agentPerformanceData.length === 0 && dbAgents.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">אין נתונים להצגה</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}