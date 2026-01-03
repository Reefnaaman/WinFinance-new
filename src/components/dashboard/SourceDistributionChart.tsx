'use client'

import React from 'react';
import { SourceData, calculateSourceDistribution } from './analyticsUtils';
import { Lead } from '@/lib/database.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * SourceDistributionChart component props
 */
export interface SourceDistributionChartProps {
  /** Analytics leads data for calculations */
  analyticsLeads: Lead[];
  /** Total leads count for percentage calculations */
  totalLeads: number;
  /** Optional CSS class name */
  className?: string;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * SourceDistributionChart Component
 *
 * PURPOSE: Modern, clean source distribution visualization
 * FEATURES:
 * - Clean minimal pie chart
 * - Simple source list
 * - Consistent with modern design
 *
 * @param props SourceDistributionChartProps
 * @returns JSX.Element
 */
export default function SourceDistributionChart({
  analyticsLeads,
  totalLeads,
  className = ""
}: SourceDistributionChartProps) {

  // ============================================================================
  // CALCULATE SOURCE DATA
  // ============================================================================

  const sourceData = calculateSourceDistribution(analyticsLeads, totalLeads);

  // ============================================================================
  // PIE CHART CALCULATIONS
  // ============================================================================

  const size = 120;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Color mapping
  const getColor = (color: string) => {
    return color === 'bg-blue-500' ? '#3B82F6' : '#8B5CF6';
  };

  // ============================================================================
  // CREATE PIE PATH
  // ============================================================================

  const createPath = (startAngle: number, endAngle: number) => {
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);

    return [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    ].join(' ');
  };

  // ============================================================================
  // RENDER PIE SEGMENTS
  // ============================================================================

  const renderPieSegments = () => {
    if (totalLeads === 0 || sourceData.length === 0) {
      return (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
        />
      );
    }

    let currentAngle = -90;
    const gap = sourceData.length > 1 ? 3 : 0;

    return sourceData.map((source, index) => {
      const percentage = (source.count / totalLeads) * 100;
      const angle = (percentage / 100) * 360 - gap;
      const path = createPath(currentAngle, currentAngle + angle);

      const segmentElement = (
        <path
          key={index}
          d={path}
          fill="none"
          stroke={getColor(source.color)}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          className="transition-all duration-500 hover:opacity-90"
        />
      );

      currentAngle += angle + gap;
      return segmentElement;
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`xl:col-span-3 ${className}`}>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">

        {/* Clean Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">מקורות לידים</h3>
          <p className="text-sm text-gray-500 mt-1">התפלגות לפי מקור</p>
        </div>

        {/* Pie Chart */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <svg width={size} height={size}>
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F9FAFB"
                strokeWidth={strokeWidth}
              />

              {/* Data segments */}
              {renderPieSegments()}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalLeads}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">סה"כ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sources List */}
        <div className="space-y-2">
          {sourceData.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(source.color) }}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {source.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {source.percentage}%
                  </div>
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {source.count}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {sourceData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">אין נתונים להצגה</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}