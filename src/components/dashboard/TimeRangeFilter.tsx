'use client'

import React from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Time range option definition
 * Extracted from: FullDashboard_backup.tsx lines 118-123
 */
export interface TimeRangeOption {
  id: 'week' | 'month' | '3months' | 'year';
  label: string;
}

/**
 * TimeRangeFilter component props
 * Extracted from: FullDashboard_backup.tsx lines 350-367
 */
export interface TimeRangeFilterProps {
  /** Currently selected time range ID */
  timeRange: string;
  /** Function to update the selected time range */
  setTimeRange: (range: string) => void;
  /** Available time range options */
  timeRanges: TimeRangeOption[];
  /** Optional CSS class name */
  className?: string;
  /** Use glass morphism styling */
  glassMorphism?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default time range options (Hebrew labels)
 * Extracted from: FullDashboard_backup.tsx lines 118-123
 */
export const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { id: 'week', label: 'שבוע' },
  { id: 'month', label: 'חודש' },
  { id: '3months', label: '3 חודשים' },
  { id: 'year', label: 'שנה' },
];

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * TimeRangeFilter Component
 *
 * PURPOSE: Renders a responsive time range selection filter
 * EXTRACTED FROM: FullDashboard_backup.tsx lines 351-367
 * MOBILE-FIRST: Optimized for touch interactions
 *
 * @param props TimeRangeFilterProps
 * @returns JSX.Element
 */
export default function TimeRangeFilter({
  timeRange,
  setTimeRange,
  timeRanges,
  className = "",
  glassMorphism = false
}: TimeRangeFilterProps) {

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`flex justify-center md:justify-end ${className}`}>
      <div className={`
        flex items-center gap-1 rounded-lg md:rounded-xl p-0.5 md:p-1 w-full md:w-auto
        ${glassMorphism
          ? 'bg-white/20 backdrop-blur-sm border border-white/30'
          : 'bg-white shadow-sm border border-slate-100'
        }
      `}>
        {timeRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => setTimeRange(range.id)}
            className={`
              /* BASE LAYOUT */
              flex-1 md:flex-none px-2 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium

              /* TRANSITIONS */
              transition-all

              /* MOBILE TOUCH TARGET - Smaller on mobile */
              min-h-[32px] md:min-h-[40px] flex items-center justify-center

              /* ACTIVE/INACTIVE STATES */
              ${timeRange === range.id
                ? glassMorphism
                  ? 'bg-white/30 text-white shadow-sm'
                  : 'bg-blue-500 text-white shadow-sm'
                : glassMorphism
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-slate-500 hover:text-slate-700 active:bg-slate-100'
              }
            `}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}