'use client'

import React from 'react';
import FilterDropdown, { FilterOption } from './FilterDropdown';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Source option definition (from FullDashboard)
 */
export interface SourceOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  lightBg: string;
  text: string;
}

/**
 * SourceFilter component props
 */
export interface SourceFilterProps {
  /** Current selected source */
  value: string;
  /** Function to handle source filter changes */
  onChange: (source: string) => void;
  /** Array of available sources */
  sources: SourceOption[];
  /** Optional CSS class name */
  className?: string;
  /** Show lead counts per source */
  showCounts?: boolean;
  /** Lead counts per source (if showCounts is true) */
  leadCounts?: Record<string, number>;
  /** Width variant for the filter dropdown */
  width?: 'sm' | 'md' | 'lg' | 'full';
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * SourceFilter Component
 *
 * PURPOSE: Specialized source filter using FilterDropdown
 * EXTRACTED FROM: Original FullDashboard source filtering
 * FEATURES:
 * - "הכל" (All) option for showing all sources
 * - Source list with Hebrew labels and icons
 * - Dynamic source options (Email, Manual, Lead Providers)
 * - Visual source indicators with colors and icons
 *
 * @param props SourceFilterProps
 * @returns JSX.Element
 */
export default function SourceFilter({
  value,
  onChange,
  sources,
  className = "",
  showCounts = false,
  leadCounts = {},
  width = 'md'
}: SourceFilterProps) {

  // ============================================================================
  // PREPARE FILTER OPTIONS
  // ============================================================================

  // Map source options to filter dropdown format
  const filterOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'הכל',
      count: showCounts ? leadCounts['all'] || 0 : undefined
    },
    ...sources.map((source) => ({
      id: source.id,
      label: source.label,
      color: source.color,
      lightBg: source.lightBg,
      text: source.text,
      count: showCounts ? leadCounts[source.id] || 0 : undefined
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
      placeholder="בחר מקור"
      label="סינון לפי מקור"
      className={className}
      showCounts={showCounts}
      allowClear={true}
      width={width}
    />
  );
}