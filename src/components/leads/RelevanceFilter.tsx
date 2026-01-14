'use client'

import React from 'react';
import FilterDropdown, { FilterOption } from './FilterDropdown';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Relevance option definition (from FullDashboard)
 */
export interface RelevanceOption {
  id: string;
  label: string;
  color: string;
  lightBg: string;
  text: string;
}

/**
 * RelevanceFilter component props
 */
export interface RelevanceFilterProps {
  /** Current selected relevance */
  value: string;
  /** Function to handle relevance filter changes */
  onChange: (relevance: string) => void;
  /** Array of available relevance statuses */
  relevanceStatuses: RelevanceOption[];
  /** Optional CSS class name */
  className?: string;
  /** Show lead counts per relevance status */
  showCounts?: boolean;
  /** Lead counts per relevance status (if showCounts is true) */
  leadCounts?: Record<string, number>;
  /** Dropdown width variant */
  width?: 'sm' | 'md' | 'lg' | 'full';
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * RelevanceFilter Component
 *
 * PURPOSE: Specialized relevance filter using FilterDropdown
 * FEATURES:
 * - Consistent dropdown UI with other filters
 * - Hebrew labels for relevance statuses
 * - Color-coded options with badges
 * - Optional lead counts per relevance status
 * - Responsive width variants
 * - RTL support
 * - "כל הרלוונטיות" (All relevance) option
 *
 * @param props RelevanceFilterProps
 * @returns JSX.Element
 */
export default function RelevanceFilter({
  value,
  onChange,
  relevanceStatuses,
  className = "",
  showCounts = false,
  leadCounts,
  width = 'md'
}: RelevanceFilterProps) {

  // ============================================================================
  // TRANSFORM DATA
  // ============================================================================

  // Convert relevance statuses to filter options
  const relevanceOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'כל הרלוונטיות',
      count: showCounts && leadCounts ? leadCounts['all'] : undefined
    },
    ...relevanceStatuses.map((relevance): FilterOption => ({
      id: relevance.id,
      label: relevance.label,
      count: showCounts && leadCounts ? leadCounts[relevance.id] : undefined,
      color: relevance.color,
      lightBg: relevance.lightBg,
      text: relevance.text
    }))
  ];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleRelevanceChange = (relevanceId: string) => {
    onChange(relevanceId);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <FilterDropdown
      value={value}
      onChange={handleRelevanceChange}
      options={relevanceOptions}
      placeholder="בחר רלוונטיות"
      label="סינון לפי רלוונטיות"
      className={className}
      width={width}
    />
  );
}