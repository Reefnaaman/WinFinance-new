'use client'

import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  onClose: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * Modern Simplified DateRangePicker
 *
 * DESIGN: 2024-2025 clean modal with minimal complexity
 * PURPOSE: Fallback modal for complex date range selection
 * FEATURES:
 * - Simple date inputs with proper RTL support
 * - Clean modern design
 * - Mobile-optimized modal
 * - Single purpose: date range selection
 *
 * @param props DateRangePickerProps
 * @returns JSX.Element
 */
export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
  onClose,
  className = ''
}: DateRangePickerProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [startDate, setStartDate] = useState(formatDateForInput(dateRange.startDate));
  const [endDate, setEndDate] = useState(formatDateForInput(dateRange.endDate));

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleApply = () => {
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);

    // Validate dates
    if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
      return;
    }

    // Ensure start is before end
    if (newStartDate > newEndDate) {
      return;
    }

    onDateRangeChange({
      startDate: newStartDate,
      endDate: new Date(newEndDate.getTime() + 24 * 60 * 60 * 1000 - 1) // End of day
    });

    onClose();
  };

  const isValidRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 ${className}`}>
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-800">בחירת תקופה</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            aria-label="סגור"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">מתאריך</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">עד תאריך</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={handleApply}
              disabled={!isValidRange()}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              החל
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}