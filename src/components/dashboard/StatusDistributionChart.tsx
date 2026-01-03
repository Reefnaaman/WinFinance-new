'use client'

import React from 'react';
import { StatusData, calculateStatusDistribution } from './analyticsUtils';
import { Lead } from '@/lib/database.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * StatusDistributionChart component props
 */
export interface StatusDistributionChartProps {
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
 * StatusDistributionChart Component
 *
 * PURPOSE: Modern, clean status distribution with donut chart
 * FEATURES:
 * - Clean, minimalist donut chart
 * - 50/50 layout on desktop (chart left, list right)
 * - Smooth animations and hover effects
 * - Modern color palette with yellow for new leads
 *
 * @param props StatusDistributionChartProps
 * @returns JSX.Element
 */
export default function StatusDistributionChart({
  analyticsLeads,
  totalLeads,
  className = ""
}: StatusDistributionChartProps) {

  // ============================================================================
  // CALCULATE STATUS DATA
  // ============================================================================

  const statusData = calculateStatusDistribution(analyticsLeads, totalLeads);

  // ============================================================================
  // MODERN DONUT CHART CALCULATIONS
  // ============================================================================

  const size = 180; // Slightly smaller for cleaner look
  const strokeWidth = 20; // Thinner for modern aesthetic
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Enhanced color mappings for modern look
  const getColor = (color: string) => {
    switch (color) {
      case 'bg-yellow-500': return '#EAB308';
      case 'bg-orange-500': return '#F97316';
      case 'bg-red-500': return '#EF4444';
      case 'bg-green-500': return '#22C55E';
      case 'bg-blue-500': return '#3B82F6';
      case 'bg-gray-500': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  // ============================================================================
  // CREATE DONUT PATH
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
  // RENDER DONUT SEGMENTS
  // ============================================================================

  const renderDonutSegments = () => {
    if (totalLeads === 0) {
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

    let currentAngle = -90; // Start from top
    const gap = 2; // Gap between segments in degrees

    return statusData.map((segment, index) => {
      const percentage = (segment.count / totalLeads) * 100;
      const angle = (percentage / 100) * 360 - (statusData.length > 1 ? gap : 0);
      const path = createPath(currentAngle, currentAngle + angle);

      const segmentElement = (
        <path
          key={index}
          d={path}
          fill="none"
          stroke={getColor(segment.color)}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          className="transition-all duration-500 hover:opacity-90"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))'
          }}
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
    <div className={`xl:col-span-5 ${className}`}>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">

        {/* Clean Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">התפלגות סטטוס</h3>
          <p className="text-sm text-gray-500 mt-1">סה"כ {totalLeads} לידים</p>
        </div>

        {/* Desktop: 50/50 Layout | Mobile: Stacked */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-8">

          {/* Modern Donut Chart - Left side on desktop */}
          <div className="relative flex-shrink-0 mb-6 md:mb-0">
            <svg width={size} height={size} className="mx-auto">
              {/* Subtle background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F9FAFB"
                strokeWidth={strokeWidth}
              />

              {/* Data segments */}
              {renderDonutSegments()}
            </svg>

            {/* Clean center display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{totalLeads}</div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">לידים</div>
              </div>
            </div>
          </div>

          {/* Clean Status List - Right side on desktop */}
          <div className="flex-1 space-y-2">
            {statusData.map((status) => {
              const dotColor = getColor(status.color);

              return (
                <div
                  key={status.id}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {status.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {status.percentage}%
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-semibold text-gray-900">
                      {status.count}
                    </div>
                  </div>
                </div>
              );
            })}

            {totalLeads === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">אין נתונים להצגה</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}