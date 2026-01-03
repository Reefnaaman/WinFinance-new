'use client'

import React from 'react';
import FilterDropdown, { FilterOption } from './FilterDropdown';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Status option definition (from FullDashboard)
 */
export interface StatusOption {
  id: string;
  label: string;
  color: string;
  lightBg: string;
  text: string;
}

/**
 * StatusFilter component props
 */
export interface StatusFilterProps {
  /** Current selected status */
  value: string;
  /** Function to handle status filter changes */
  onChange: (status: string) => void;
  /** Array of available statuses */
  statuses: StatusOption[];
  /** Optional CSS class name */
  className?: string;
  /** Show lead counts per status */
  showCounts?: boolean;
  /** Lead counts per status (if showCounts is true) */
  leadCounts?: Record<string, number>;
  /** Dropdown width variant */
  width?: 'sm' | 'md' | 'lg' | 'full';
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * StatusFilter Component
 *
 * PURPOSE: Specialized status filter using FilterDropdown
 * EXTRACTED FROM: Original FullDashboard status filtering
 * FEATURES:
 * - "הכל" (All) option for showing all statuses
 * - Status list with Hebrew labels and color indicators
 * - Proper status filtering integration
 * - Visual status indicators with colors
 *
 * @param props StatusFilterProps
 * @returns JSX.Element
 */
export default function StatusFilter({
  value,
  onChange,
  statuses,
  className = "",
  showCounts = false,
  leadCounts = {},
  width = 'md'
}: StatusFilterProps) {

  // ============================================================================
  // PREPARE FILTER OPTIONS
  // ============================================================================

  // Map status options to filter dropdown format
  const filterOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'הכל',
      count: showCounts ? leadCounts['all'] || 0 : undefined
    },
    ...statuses.map((status) => ({
      id: status.id,
      label: status.label,
      color: status.color,
      lightBg: status.lightBg,
      text: status.text,
      count: showCounts ? leadCounts[status.id] || 0 : undefined
    }))
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <FilterDropdown
      value={value}
      onChange={onChange}
      options={filterOptions}
      placeholder="בחר סטטוס"
      label="סינון לפי סטטוס"
      className={className}
      showCounts={showCounts}
      allowClear={true}
      width={width}
    />
  );
}