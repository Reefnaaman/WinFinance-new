'use client'

import React from 'react';
import { StatusData, calculateStatusDistribution } from './analyticsUtils';
import { Lead } from '@/lib/database.types';
import { BarChart3 } from 'lucide-react';

// ============================================================================
// COMPACT STATUS CHART - 2025 Clean Design
// ============================================================================

export interface CompactStatusChartProps {
  analyticsLeads: Lead[];
  totalLeads: number;
  className?: string;
}

/**
 * CompactStatusChart Component
 *
 * Ultra-clean, space-efficient status distribution
 * Minimal cognitive load, maximum information density
 */
export default function CompactStatusChart({
  analyticsLeads,
  totalLeads,
  className = ""
}: CompactStatusChartProps) {
  const statusData = calculateStatusDistribution(analyticsLeads, totalLeads);

  // Simple, clean colors - less overwhelming
  const getCleanColor = (originalColor: string) => {
    switch (originalColor) {
      case 'bg-yellow-500': return 'bg-amber-400';
      case 'bg-orange-500': return 'bg-orange-400';
      case 'bg-red-500': return 'bg-red-400';
      case 'bg-green-500': return 'bg-green-400';
      case 'bg-blue-500': return 'bg-blue-400';
      case 'bg-gray-500': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  // Get the max count to scale all bars
  const maxCount = Math.max(...statusData.map(s => s.count), 1);

  return (
    <div
      className={`
        bg-white rounded-2xl
        shadow-sm border border-gray-200
        p-4
        ${className}
      `}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            התפלגות סטטוס
          </h3>
          <p className="text-xs text-gray-500">
            {totalLeads} לידים
          </p>
        </div>
        <BarChart3 className="w-5 h-5 text-blue-500" />
      </div>

      {/* Clean status list */}
      <div className="space-y-2">
        {statusData.map((status) => (
          <div key={status.id} className="flex items-center justify-between">
            {/* Status name with count - closer together */}
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-3 h-3 rounded-full ${getCleanColor(status.color)}`} />
              <span className="text-sm text-gray-900 truncate">
                {status.label}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {status.count}
              </span>
            </div>

            {/* Percentage - compact */}
            <span className="text-xs text-gray-500 ml-2">
              {status.percentage}%
            </span>
          </div>
        ))}

        {/* No data state */}
        {statusData.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">אין נתונים</p>
          </div>
        )}
      </div>
    </div>
  );
}