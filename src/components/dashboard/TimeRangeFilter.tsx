'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Date range interface for custom selections
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Time range option definition - Modern simplified approach
 */
export interface TimeRangeOption {
  id: 'current_month' | 'current_quarter' | 'current_year' | 'custom';
  label: string;
}

/**
 * TimeRangeFilter component props - Clean and modern
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
  /** Custom date range for when timeRange is 'custom' */
  customDateRange?: DateRange;
  /** Function to update custom date range */
  onCustomDateRangeChange?: (dateRange: DateRange) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Modern simplified time range options (Hebrew labels)
 * Following 2024-2025 best practices - minimal and clean
 */
export const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { id: 'current_month', label: 'החודש' },
  { id: 'current_quarter', label: 'הרבעון' },
  { id: 'current_year', label: 'השנה' },
  { id: 'custom', label: 'בחירה מותאמת' },
];

/**
 * Hebrew months for date formatting
 */
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * Modern TimeRangeFilter Component
 *
 * DESIGN: 2024-2025 modern standards with hybrid approach
 * FEATURES:
 * - Clean dropdown with preset options
 * - Inline date inputs for custom range
 * - Proper RTL Hebrew support
 * - Mobile-first responsive design
 * - Native-feeling interactions
 *
 * @param props TimeRangeFilterProps
 * @returns JSX.Element
 */
export default function TimeRangeFilter({
  timeRange,
  setTimeRange,
  timeRanges,
  className = "",
  glassMorphism = false,
  customDateRange,
  onCustomDateRangeChange
}: TimeRangeFilterProps) {

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(timeRange === 'custom');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // EVENT HANDLERS & EFFECTS
  // ============================================================================

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Show/hide custom inputs based on selection
  useEffect(() => {
    setShowCustomInputs(timeRange === 'custom');
  }, [timeRange]);

  const handleOptionSelect = (rangeId: string) => {
    setTimeRange(rangeId);
    setIsOpen(false);
    if (rangeId !== 'custom') {
      setShowCustomInputs(false);
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    if (!customDateRange || !onCustomDateRangeChange) return;

    const date = new Date(value);
    if (isNaN(date.getTime())) return;

    const newRange = {
      startDate: field === 'start' ? date : customDateRange.startDate,
      endDate: field === 'end' ? date : customDateRange.endDate,
    };

    onCustomDateRangeChange(newRange);
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getDisplayLabel = () => {
    if (timeRange === 'custom' && customDateRange) {
      const start = customDateRange.startDate;
      const end = customDateRange.endDate;

      // Smart formatting based on date range
      if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
        return `${HEBREW_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
      }

      const startStr = `${HEBREW_MONTHS[start.getMonth()]} ${start.getFullYear()}`;
      const endStr = `${HEBREW_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
      return `${startStr} - ${endStr}`;
    }

    const option = timeRanges.find(r => r.id === timeRange);
    return option?.label || 'בחר תקופה';
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Modern Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-sm font-medium transition-all
          min-h-[44px] min-w-[140px] justify-between
          ${glassMorphism
            ? 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/25 shadow-lg'
            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
          }
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{getDisplayLabel()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Modern Dropdown Menu */}
      {isOpen && (
        <div className={`
          absolute top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200
          z-50 overflow-hidden
          ${glassMorphism ? 'backdrop-blur-md bg-white/95' : ''}
        `}>
          {/* Preset Options */}
          <div className="p-1">
            {timeRanges.filter(range => range.id !== 'custom').map((range) => (
              <button
                key={range.id}
                onClick={() => handleOptionSelect(range.id)}
                className={`
                  w-full flex items-center px-3 py-2.5 text-right rounded-lg transition-colors
                  ${timeRange === range.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                {range.label}
              </button>
            ))}

            {/* Custom Option */}
            <button
              onClick={() => handleOptionSelect('custom')}
              className={`
                w-full flex items-center px-3 py-2.5 text-right rounded-lg transition-colors
                ${timeRange === 'custom'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
                }
              `}
            >
              בחירה מותאמת
            </button>
          </div>

          {/* Custom Date Inputs - Show when custom is selected */}
          {showCustomInputs && (
            <div className="border-t border-slate-100 p-4 space-y-3">
              <div className="text-xs font-medium text-slate-600 mb-3">הגדרת תאריכים</div>

              {/* Start Date */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">מתאריך</label>
                <input
                  type="date"
                  value={customDateRange ? formatDateForInput(customDateRange.startDate) : ''}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">עד תאריך</label>
                <input
                  type="date"
                  value={customDateRange ? formatDateForInput(customDateRange.endDate) : ''}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}