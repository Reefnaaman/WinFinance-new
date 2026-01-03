'use client'

import React from 'react';
import { StatusData, calculateStatusDistribution } from './analyticsUtils';
import { Lead } from '@/lib/database.types';
import { BarChart3 } from 'lucide-react';

// ============================================================================
// MODERN COMPACT STATUS CHART - 2025 with Donut
// ============================================================================

export interface ModernCompactStatusChartProps {
  analyticsLeads: Lead[];
  totalLeads: number;
  className?: string;
}

/**
 * ModernCompactStatusChart Component
 *
 * Beautiful donut chart with glassmorphic design, but space-efficient
 */
export default function ModernCompactStatusChart({
  analyticsLeads,
  totalLeads,
  className = ""
}: ModernCompactStatusChartProps) {
  const statusData = calculateStatusDistribution(analyticsLeads, totalLeads);
  const actualTotal = analyticsLeads.length;

  // Modern donut chart settings - bigger and impressive
  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Modern gradient colors
  const getColor = (color: string) => {
    switch (color) {
      case 'bg-yellow-500': return '#F59E0B';
      case 'bg-orange-500': return '#F97316';
      case 'bg-red-500': return '#EF4444';
      case 'bg-green-500': return '#10B981';
      case 'bg-blue-500': return '#3B82F6';
      case 'bg-gray-500': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const createPath = (startAngle: number, endAngle: number, addGap: boolean = true) => {
    // Add 1-degree gap on each side for separation (2 degrees total between segments)
    const gapAngle = addGap ? 1 : 0;
    const adjustedStartAngle = startAngle + gapAngle;
    const adjustedEndAngle = endAngle - gapAngle;

    // Ensure we have at least some angle to draw
    if (adjustedEndAngle <= adjustedStartAngle) {
      return '';
    }

    const largeArcFlag = adjustedEndAngle - adjustedStartAngle > 180 ? 1 : 0;
    const x1 = center + radius * Math.cos((adjustedStartAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((adjustedStartAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((adjustedEndAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((adjustedEndAngle * Math.PI) / 180);

    return [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    ].join(' ');
  };

  const renderDonutSegments = () => {
    if (actualTotal === 0) {
      return (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
      );
    }

    let currentAngle = -90; // Start from top
    const minAngle = 8; // Minimum 8 degrees for visibility

    // Calculate actual angles and enforce minimum
    const segmentsWithAngles = statusData.map(status => {
      const originalAngle = (status.count / actualTotal) * 360;
      const displayAngle = Math.max(originalAngle, status.count > 0 ? minAngle : 0);
      return { ...status, originalAngle, displayAngle };
    });

    // If we have segments smaller than minimum, we need to scale others down proportionally
    const totalOriginalAngle = segmentsWithAngles.reduce((sum, s) => sum + s.originalAngle, 0);
    const totalDisplayAngle = segmentsWithAngles.reduce((sum, s) => sum + s.displayAngle, 0);

    // Adjust angles if needed to fit 360 degrees
    if (totalDisplayAngle > 360) {
      const scaleFactor = 360 / totalDisplayAngle;
      segmentsWithAngles.forEach(s => {
        s.displayAngle *= scaleFactor;
      });
    }

    return segmentsWithAngles.map((status, index) => {
      const segmentAngle = status.displayAngle;

      // Skip if segment is too small to display
      if (segmentAngle < 0.5) return null;

      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;

      // Only add gaps if segment is large enough
      const addGap = segmentAngle > 3;
      const path = createPath(startAngle, endAngle, addGap);
      currentAngle += segmentAngle;

      if (!path) return null;

      return (
        <path
          key={status.id}
          d={path}
          fill="none"
          stroke={getColor(status.color)}
          strokeWidth={strokeWidth}
          className="transition-all duration-300 hover:opacity-80"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            animation: `drawSegment 1s ease-out ${index * 0.1}s both`
          }}
        />
      );
    }).filter(Boolean);
  };

  return (
    <div
      className={`
        relative
        bg-white/80 backdrop-blur-xl
        border border-white/20
        rounded-2xl
        p-4
        shadow-lg hover:shadow-xl
        transition-all duration-300
        ${className}
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/30 rounded-2xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              התפלגות סטטוס
            </h3>
            <p className="text-xs text-gray-500">
              {totalLeads} לידים סה״כ
            </p>
          </div>
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>

        {/* Vertical layout: Big impressive donut above clean legend */}
        <div className="space-y-4">
          {/* Big Impressive Donut Chart - centered */}
          <div className="flex justify-center">
            <div className="relative">
              <svg width={size} height={size} className="transform -rotate-90 drop-shadow-lg">
                {renderDonutSegments()}
              </svg>

              {/* Center total - properly positioned and bigger */}
              <div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{ pointerEvents: 'none' }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{actualTotal}</div>
                  <div className="text-sm text-gray-600">לידים</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Modern Legend - below the donut */}
          <div className="space-y-1">
            {/* Legend Headers */}
            <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-200 mb-1">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-4" /> {/* Space for color dot */}
                <span className="text-xs text-gray-500 flex-1">סטטוס</span>
                <span className="text-xs text-gray-500 ml-6 min-w-[50px] text-center">כמות</span>
              </div>
              <span className="text-xs text-gray-500 ml-3 min-w-[40px] text-right">אחוז</span>
            </div>

            {/* Status Items */}
            {statusData.map((status) => (
              <div key={status.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full shadow-sm border border-white/30"
                    style={{ backgroundColor: getColor(status.color) }}
                  />
                  <span className="text-sm text-gray-700 flex-1 font-medium">
                    {status.label}
                  </span>
                  <span className="text-base font-bold text-gray-900 ml-6 min-w-[50px] text-center">
                    {status.count}
                  </span>
                </div>
                <span className="text-sm text-gray-600 ml-3 min-w-[40px] text-right font-semibold">
                  {status.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes drawSegment {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}