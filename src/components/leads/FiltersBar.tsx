'use client'

import React from 'react';
import AgentFilter from './AgentFilter';
import StatusFilter, { StatusOption } from './StatusFilter';
import SourceFilter, { SourceOption } from './SourceFilter';
import SortingDropdown from './SortingDropdown';
import { Agent } from '@/lib/database.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * FiltersBar component props
 */
export interface FiltersBarProps {
  /** Current search term */
  searchTerm: string;
  /** Function to handle search changes */
  setSearchTerm: (term: string) => void;
  /** Current selected agent */
  activeAgent: string;
  /** Function to handle agent filter changes */
  setActiveAgent: (agentId: string) => void;
  /** Current selected status */
  activeStatus: string;
  /** Function to handle status filter changes */
  setActiveStatus: (status: string) => void;
  /** Current selected source */
  activeSource: string;
  /** Function to handle source filter changes */
  setActiveSource: (source: string) => void;
  /** Array of available agents */
  agents: Agent[];
  /** Array of available statuses */
  statuses: StatusOption[];
  /** Array of available sources */
  sources: SourceOption[];
  /** Show filter result counts */
  showCounts?: boolean;
  /** Lead counts per filter */
  filterCounts?: {
    agents: Record<string, number>;
    statuses: Record<string, number>;
    sources: Record<string, number>;
  };
  /** Optional CSS class name */
  className?: string;
  /** Children for action buttons */
  children?: React.ReactNode;
  /** Sorting state */
  sortBy: 'status' | 'date' | 'name' | 'agent';
  setSortBy: (sort: 'status' | 'date' | 'name' | 'agent') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  /** Total leads count */
  totalLeads?: number;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * FiltersBar Component
 *
 * PURPOSE: Comprehensive filters bar for desktop LeadsPage experience
 * FEATURES:
 * - Responsive grid layout (mobile: stacked, desktop: horizontal)
 * - Search input with proper Hebrew placeholder
 * - Agent, Status, and Source filter dropdowns
 * - Action buttons area for CSV Import/Export, Lead Entry
 * - Active filter indicators and counts
 * - Clear all filters functionality
 * - RTL layout support
 *
 * @param props FiltersBarProps
 * @returns JSX.Element
 */
export default function FiltersBar({
  searchTerm,
  setSearchTerm,
  activeAgent,
  setActiveAgent,
  activeStatus,
  setActiveStatus,
  activeSource,
  setActiveSource,
  agents,
  statuses,
  sources,
  showCounts = false,
  filterCounts,
  className = "",
  children,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  totalLeads = 0
}: FiltersBarProps) {
  // State for mobile filter panel
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [mobileSortOpen, setMobileSortOpen] = React.useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Count active filters
  const activeFiltersCount = [
    activeAgent !== 'all',
    activeStatus !== 'all',
    activeSource !== 'all',
    searchTerm.length > 0
  ].filter(Boolean).length;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleClearAllFilters = () => {
    setActiveAgent('all');
    setActiveStatus('all');
    setActiveSource('all');
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible ${className}`}>

      {/* Header with Clear Filters */}
      <div className="bg-slate-50 px-4 md:px-6 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">ניהול לידים</h3>
            {totalLeads > 0 && (
              <span className="text-sm text-slate-500">
                ({totalLeads} לידים נמצאו)
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              <span>נקה הכל</span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                {activeFiltersCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Top Bar - Search + Add Lead Button */}
      <div className="md:hidden px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {/* Search Input - Takes most space */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="חיפוש..."
              className="w-full px-3 py-2 pl-8 text-sm text-right bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all h-9"
              dir="rtl"
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Add Lead Button - Extracted from children for mobile */}
          {children}
        </div>

        {/* Filter and Sort Buttons Row */}
        <div className="flex gap-2 mt-3">
          {/* Filter Button */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-blue-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>סינון על פי</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Button - Purple styled like Filter button */}
          <button
            onClick={() => setMobileSortOpen(!mobileSortOpen)}
            className="flex-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-purple-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span>מיון על פי</span>
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {mobileFiltersOpen && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">סוכן</label>
                <AgentFilter
                  value={activeAgent}
                  onChange={setActiveAgent}
                  agents={agents}
                  showCounts={false}
                  leadCounts={filterCounts?.agents}
                  width="sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">סטטוס</label>
                <StatusFilter
                  value={activeStatus}
                  onChange={setActiveStatus}
                  statuses={statuses}
                  showCounts={false}
                  leadCounts={filterCounts?.statuses}
                  width="sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">מקור</label>
                <SourceFilter
                  value={activeSource}
                  onChange={setActiveSource}
                  sources={sources}
                  showCounts={false}
                  leadCounts={filterCounts?.sources}
                  width="sm"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="w-full py-2 text-sm text-slate-600 hover:text-slate-800 bg-white rounded-lg border border-slate-300 transition-colors"
              >
                נקה כל הסינונים
              </button>
            )}
          </div>
        )}

        {/* Collapsible Sort Panel */}
        {mobileSortOpen && (
          <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
              {/* Sort Options - 3 buttons */}
              <button
                onClick={() => setSortBy('status')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'status'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 hover:bg-purple-100'
                } border border-purple-300`}
              >
                סטטוס
              </button>
              <button
                onClick={() => setSortBy('date')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'date'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 hover:bg-purple-100'
                } border border-purple-300`}
              >
                תאריך
              </button>
              <button
                onClick={() => setSortBy('agent')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sortBy === 'agent'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 hover:bg-purple-100'
                } border border-purple-300`}
              >
                סוכן
              </button>

              {/* Sort Direction Toggle */}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 bg-white hover:bg-purple-100 rounded-lg transition-colors border border-purple-300"
                title={sortOrder === 'asc' ? 'סדר עולה' : 'סדר יורד'}
              >
                {sortOrder === 'asc' ? (
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Filters Grid */}
      <div className="hidden md:block p-4 md:p-6 space-y-3">
        {/* Desktop Layout: Search (Left) | Filters (Middle) | Sorting (Right) */}
        <div className="flex flex-row gap-4 items-start">
          {/* Search and Actions - Left Side */}
          <div className="w-auto flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="חיפוש..."
                className="w-64 px-3 py-2.5 pl-8 text-sm text-right bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 h-10"
                dir="rtl"
              />
              {/* Search Icon */}
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Clear Search */}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Action Buttons - Below Search on Desktop */}
            {children && (
              <div className="flex items-center gap-1 md:gap-2 mt-2">
                {children}
              </div>
            )}
          </div>

          {/* Filter Section */}
          <div className="hidden md:block">
            {/* Filters Header */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-t-lg px-3 py-1.5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-xs font-semibold text-blue-700">סינון על פי</span>
              </div>
            </div>

            {/* Filter controls */}
            <div className="border border-t-0 border-blue-200 rounded-b-lg p-2 bg-white">
              <div className="flex gap-2">
                {/* Agent Filter */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    סוכן
                  </label>
                  <AgentFilter
                    value={activeAgent}
                    onChange={setActiveAgent}
                    agents={agents}
                    showCounts={false}
                    leadCounts={filterCounts?.agents}
                  />
                </div>

                {/* Status Filter */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    סטטוס
                  </label>
                  <StatusFilter
                    value={activeStatus}
                    onChange={setActiveStatus}
                    statuses={statuses}
                    showCounts={false}
                    leadCounts={filterCounts?.statuses}
                  />
                </div>

                {/* Source Filter */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    מקור
                  </label>
                  <SourceFilter
                    value={activeSource}
                    onChange={setActiveSource}
                    sources={sources}
                    showCounts={false}
                    leadCounts={filterCounts?.sources}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sorting Section */}
          <div className="hidden md:block ml-3">
              {/* Sort Header */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-200 rounded-t-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span className="text-xs font-semibold text-purple-700">מיון על פי</span>
                </div>
              </div>

              {/* Sort controls */}
              <div className="border border-t-0 border-purple-200 rounded-b-lg p-2 bg-white">
                <SortingDropdown
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                />
              </div>
            </div>

        </div>
      </div>

      {/* Active Filters Summary - Desktop Only */}
      {activeFiltersCount > 0 && (
        <div className="hidden md:block border-t border-slate-100 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">סינונים פעילים:</span>

            {activeAgent !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md">
                סוכן: {agents.find(a => a.id === activeAgent)?.name || 'לא ידוע'}
                <button onClick={() => setActiveAgent('all')} className="mr-1 text-blue-500 hover:text-blue-700">×</button>
              </span>
            )}

            {activeStatus !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md">
                סטטוס: {statuses.find(s => s.id === activeStatus)?.label || 'לא ידוע'}
                <button onClick={() => setActiveStatus('all')} className="mr-1 text-green-500 hover:text-green-700">×</button>
              </span>
            )}

            {activeSource !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md">
                מקור: {sources.find(s => s.id === activeSource)?.label || 'לא ידוע'}
                <button onClick={() => setActiveSource('all')} className="mr-1 text-purple-500 hover:text-purple-700">×</button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-md">
                חיפוש: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="mr-1 text-amber-500 hover:text-amber-700">×</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}