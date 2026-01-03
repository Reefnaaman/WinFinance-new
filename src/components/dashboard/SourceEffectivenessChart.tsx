'use client'

import React from 'react';
import { Mail, Users, FileSpreadsheet, MoreHorizontal, TrendingUp } from 'lucide-react';
import { Lead } from '@/lib/database.types';
import { calculateSourceEffectiveness, SourceEffectivenessData } from './analyticsUtils';

// ============================================================================
// SOURCE EFFECTIVENESS CHART - 2025 Design
// ============================================================================

export interface SourceEffectivenessChartProps {
  analyticsLeads: Lead[];
  className?: string;
}

/**
 * SourceEffectivenessChart Component
 *
 * Modern source ROI visualization with focus on revenue generation
 * Features:
 * - Revenue-focused metrics
 * - Conversion rate indicators
 * - Animated horizontal bars
 * - Glassmorphic design
 * - Click-to-filter functionality
 */
export default function SourceEffectivenessChart({
  analyticsLeads,
  className = ''
}: SourceEffectivenessChartProps) {
  // Calculate source effectiveness data
  const sourceData = calculateSourceEffectiveness(analyticsLeads);

  // Find max revenue for scaling bars
  const maxRevenue = Math.max(...sourceData.map(s => s.revenue), 1);

  // Calculate total for percentage display
  const totalRevenue = sourceData.reduce((sum, s) => sum + s.revenue, 0);
  const totalLeads = sourceData.reduce((sum, s) => sum + s.totalLeads, 0);

  // Get icon for each source
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'Google Sheet':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'Manual':
        return <Users className="w-4 h-4" />;
      default:
        // Lead suppliers get a users icon
        return <Users className="w-4 h-4" />;
    }
  };

  // Determine quality indicator color
  const getQualityColor = (conversionRate: number) => {
    if (conversionRate >= 15) return 'text-emerald-600 bg-emerald-50';
    if (conversionRate >= 10) return 'text-blue-600 bg-blue-50';
    if (conversionRate >= 5) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-pink-50/20 rounded-2xl" />

      <div className="relative z-10">
      {/* Compact Header with Total */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            יעילות מקורות
          </h3>
          <p className="text-xs text-gray-500">
            הכנסות ואחוזי המרה
          </p>
        </div>
        <TrendingUp className="w-5 h-5 text-blue-500" />
      </div>

      {/* Donut Chart for Source Distribution */}
      <div className="mb-4 flex items-center gap-4">
        <p className="text-sm font-semibold text-gray-700 min-w-fit">התפלגות<br/>מקורות</p>
        <div className="flex justify-center flex-1">
          <div className="relative">
            <svg width="160" height="160" className="transform -rotate-90 drop-shadow-lg">
            {(() => {
              const size = 160;
              const strokeWidth = 16;
              const radius = (size - strokeWidth) / 2;
              const center = size / 2;
              const total = sourceData.reduce((sum, s) => sum + s.totalLeads, 0);
              const minAngle = 8; // Minimum 8 degrees for visibility

              if (total === 0) {
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

              // Calculate actual angles and enforce minimum
              const segmentsWithAngles = sourceData.map(source => {
                const originalAngle = (source.totalLeads / total) * 360;
                const displayAngle = Math.max(originalAngle, source.totalLeads > 0 ? minAngle : 0);
                return { ...source, originalAngle, displayAngle };
              });

              // Adjust angles if needed to fit 360 degrees
              const totalDisplayAngle = segmentsWithAngles.reduce((sum, s) => sum + s.displayAngle, 0);
              if (totalDisplayAngle > 360) {
                const scaleFactor = 360 / totalDisplayAngle;
                segmentsWithAngles.forEach(s => {
                  s.displayAngle *= scaleFactor;
                });
              }

              let currentAngle = -90;

              return segmentsWithAngles.map((source, index) => {
                const segmentAngle = source.displayAngle;

                // Skip if segment is too small to display
                if (segmentAngle < 0.5) return null;

                const startAngle = currentAngle;
                const endAngle = currentAngle + segmentAngle;

                // Add 1-degree gap on each side for separation (only for larger segments)
                const addGap = segmentAngle > 3;
                const gapAngle = addGap ? 1 : 0;
                const adjustedStartAngle = startAngle + gapAngle;
                const adjustedEndAngle = endAngle - gapAngle;

                // Ensure we have at least some angle to draw
                if (adjustedEndAngle <= adjustedStartAngle) return null;

                const largeArcFlag = adjustedEndAngle - adjustedStartAngle > 180 ? 1 : 0;
                const x1 = center + radius * Math.cos((adjustedStartAngle * Math.PI) / 180);
                const y1 = center + radius * Math.sin((adjustedStartAngle * Math.PI) / 180);
                const x2 = center + radius * Math.cos((adjustedEndAngle * Math.PI) / 180);
                const y2 = center + radius * Math.sin((adjustedEndAngle * Math.PI) / 180);

                const path = [
                  `M ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                ].join(' ');

                currentAngle += segmentAngle;

                // Match colors to the card colors
                const colors = ['#A855F7', '#3B82F6', '#10B981', '#6B7280'];

                return (
                  <path
                    key={source.source}
                    d={path}
                    fill="none"
                    stroke={colors[index] || '#9CA3AF'}
                    strokeWidth={strokeWidth}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                      animation: `drawSegment 1s ease-out ${index * 0.1}s both`
                    }}
                  />
                );
              }).filter(Boolean);
            })()}
          </svg>

          {/* Center total */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ pointerEvents: 'none' }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalLeads}</div>
              <div className="text-sm text-gray-600">לידים</div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Ultra-Modern Analytics Cards */}
      <div className="space-y-2">
        {sourceData.map((source, index) => {
          const revenuePercent = totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0;
          const maxSourceRevenue = Math.max(...sourceData.map(s => s.revenue), 1);
          const barWidth = (source.revenue / maxSourceRevenue) * 100;

          // Unified color scheme
          const getCardColor = (idx: number) => {
            switch(idx) {
              case 0: return { bg: 'bg-purple-50/40', border: 'border-purple-200/50', metric: 'bg-purple-100', text: 'text-purple-700' };
              case 1: return { bg: 'bg-blue-50/40', border: 'border-blue-200/50', metric: 'bg-blue-100', text: 'text-blue-700' };
              case 2: return { bg: 'bg-emerald-50/40', border: 'border-emerald-200/50', metric: 'bg-emerald-100', text: 'text-emerald-700' };
              default: return { bg: 'bg-gray-50/40', border: 'border-gray-200/50', metric: 'bg-gray-100', text: 'text-gray-700' };
            }
          };

          const cardColor = getCardColor(index);

          return (
            <div
              key={source.source}
              className={`
                p-3 rounded-xl
                ${cardColor.bg}
                border ${cardColor.border}
                backdrop-blur-sm
                transition-all duration-300
                hover:shadow-sm hover:scale-[1.005]
              `}
            >
              {/* Streamlined Layout */}
              <div className="flex items-center justify-between">
                {/* Left: Source Info */}
                <div className="flex items-center gap-2.5">
                  <div className={`
                    w-10 h-10 rounded-lg ${cardColor.metric}
                    flex items-center justify-center
                  `}>
                    {getSourceIcon(source.source)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {source.label}
                    </h4>
                  </div>
                </div>

                {/* Right: Metrics with glassmorphic cubes - matching agent tracking */}
                <div className="flex items-center">
                  {/* Total Leads */}
                  <div className="relative text-center px-3">
                    {/* Glassmorphic cube background - matching agent tracking */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-blue-200/20 backdrop-blur-sm rounded-lg border border-blue-200/30 shadow-sm" />
                    <div className="relative z-10">
                      <p className="text-base font-bold text-black">{source.totalLeads}</p>
                      <p className="text-[10px] text-gray-600">לידים</p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 mx-1" />

                  {/* Deals */}
                  <div className="relative text-center px-3">
                    {/* Glassmorphic cube background - matching agent tracking */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/40 to-emerald-200/20 backdrop-blur-sm rounded-lg border border-emerald-200/30 shadow-sm" />
                    <div className="relative z-10">
                      <p className="text-base font-bold text-black">{source.closedDeals}</p>
                      <p className="text-[10px] text-gray-600">עסקאות</p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 mx-1" />

                  {/* Conversion Rate */}
                  <div className="relative text-center px-3">
                    {/* Glassmorphic cube background - matching agent tracking */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100/40 to-purple-200/20 backdrop-blur-sm rounded-lg border border-purple-200/30 shadow-sm" />
                    <div className="relative z-10">
                      <p className="text-base font-bold text-black">{source.conversionRate.toFixed(0)}%</p>
                      <p className="text-[10px] text-gray-600">המרה</p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 mx-1" />

                  {/* Revenue */}
                  <div className="relative text-center px-3 min-w-[70px]">
                    {/* Glassmorphic cube background - matching agent tracking */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 to-amber-200/20 backdrop-blur-sm rounded-lg border border-amber-200/30 shadow-sm" />
                    <div className="relative z-10">
                      <p className="text-base font-bold text-gray-900">
                        {source.revenue >= 1000
                          ? `${(source.revenue / 1000).toFixed(0)}k₪`
                          : `${source.revenue}₪`}
                      </p>
                      <p className="text-[10px] text-gray-600">הכנסות</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtle Progress Indicator */}
              <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out
                    ${index === 0 ? 'bg-purple-400/40' :
                      index === 1 ? 'bg-blue-400/40' :
                      index === 2 ? 'bg-emerald-400/40' :
                      'bg-gray-400/40'}
                  `}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* No data state */}
        {sourceData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              אין נתונים זמינים
            </p>
          </div>
        )}
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