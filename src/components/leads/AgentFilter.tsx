'use client'

import React from 'react';
import FilterDropdown, { FilterOption } from './FilterDropdown';
import { Agent } from '@/lib/database.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * AgentFilter component props
 */
export interface AgentFilterProps {
  /** Current selected agent ID */
  value: string;
  /** Function to handle agent filter changes */
  onChange: (agentId: string) => void;
  /** Array of available agents */
  agents: Agent[];
  /** Optional CSS class name */
  className?: string;
  /** Show lead counts per agent */
  showCounts?: boolean;
  /** Lead counts per agent (if showCounts is true) */
  leadCounts?: Record<string, number>;
  /** Dropdown width variant */
  width?: 'sm' | 'md' | 'lg' | 'full';
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * AgentFilter Component
 *
 * PURPOSE: Specialized agent filter using FilterDropdown
 * EXTRACTED FROM: Original FullDashboard filtering requirements
 * FEATURES:
 * - "הכל" (All) option for showing all leads
 * - Agent list with names and optional counts
 * - Proper agent filtering integration
 * - Hebrew interface with RTL support
 *
 * @param props AgentFilterProps
 * @returns JSX.Element
 */
export default function AgentFilter({
  value,
  onChange,
  agents,
  className = "",
  showCounts = false,
  leadCounts = {},
  width = 'md'
}: AgentFilterProps) {

  // ============================================================================
  // PREPARE FILTER OPTIONS
  // ============================================================================

  // Filter out non-agent users (only show actual agents)
  const agentsList = agents.filter(agent => agent.role === 'agent');

  // Build filter options array
  const filterOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'הכל',
      count: showCounts ? leadCounts['all'] || 0 : undefined
    },
    ...agentsList.map((agent) => ({
      id: agent.id,
      label: agent.name,
      count: showCounts ? leadCounts[agent.id] || 0 : undefined
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
      placeholder="בחר סוכן"
      label="סינון לפי סוכן"
      className={className}
      showCounts={showCounts}
      allowClear={true}
      width={width}
    />
  );
}