'use client'

import React from 'react';
import AgentFilter from './AgentFilter';
import StatusFilter, { StatusOption } from './StatusFilter';
import SourceFilter, { SourceOption } from './SourceFilter';
import RelevanceFilter, { RelevanceOption } from './RelevanceFilter';
import TimeRangeFilter, { DEFAULT_TIME_RANGES } from '../dashboard/TimeRangeFilter';
import { DateRange } from '../dashboard/DateRangePicker';
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
  /** Current selected relevance */
  activeRelevance: string;
  /** Function to handle relevance filter changes */
  setActiveRelevance: (relevance: string) => void;
  /** Current time range */
  timeRange: string;
  /** Function to handle time range changes */
  setTimeRange: (range: string) => void;
  /** Custom date range for when timeRange is 'custom' */
  customDateRange: DateRange;
  /** Function to update custom date range */
  setCustomDateRange: (range: DateRange) => void;
  /** Array of available agents */
  agents: Agent[];
  /** Array of available statuses */
  statuses: StatusOption[];
  /** Array of available sources */
  sources: SourceOption[];
  /** Array of available relevance statuses */
  relevanceStatuses: RelevanceOption[];
  /** Show filter result counts */
  showCounts?: boolean;
  /** Lead counts per filter */
  filterCounts?: {
    agents: Record<string, number>;
    statuses: Record<string, number>;
    sources: Record<string, number>;
    relevance: Record<string, number>;
  };
  /** Optional CSS class name */
  className?: string;
  /** Children for action buttons */
  children?: React.ReactNode;
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
  activeRelevance,
  setActiveRelevance,
  timeRange,
  setTimeRange,
  customDateRange,
  setCustomDateRange,
  agents,
  statuses,
  sources,
  relevanceStatuses,
  showCounts = false,
  filterCounts,
  className = "",
  children,
  totalLeads = 0
}: FiltersBarProps) {
  // State for mobile filter panel
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Count active filters
  const activeFiltersCount = [
    activeAgent !== 'all',
    activeStatus !== 'all',
    activeSource !== 'all',
    activeRelevance !== 'all',
    timeRange !== 'current_month',
    searchTerm.length > 0
  ].filter(Boolean).length;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleClearAllFilters = () => {
    setActiveAgent('all');
    setActiveStatus('all');
    setActiveSource('all');
    setActiveRelevance('all');
    setTimeRange('current_month');
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

        {/* Filter Button */}
        <div className="mt-3">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-blue-200 transition-all"
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
        </div>

        {/* Collapsible Filter Panel */}
        {mobileFiltersOpen && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Date Range Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">תקופה</label>
              <TimeRangeFilter
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                timeRanges={DEFAULT_TIME_RANGES}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
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

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">רלוונטיות</label>
                <RelevanceFilter
                  value={activeRelevance}
                  onChange={setActiveRelevance}
                  relevanceStatuses={relevanceStatuses}
                  showCounts={false}
                  leadCounts={filterCounts?.relevance}
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

            {/* Action Buttons - Below Search with same width */}
            {children && (
              <div className="w-64 mt-2">
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
            <div className="border border-t-0 border-blue-200 rounded-b-lg p-2 bg-white space-y-3">
              {/* Date Range Filter - Full Width */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">תקופה</label>
                <TimeRangeFilter
                  timeRange={timeRange}
                  setTimeRange={setTimeRange}
                  timeRanges={DEFAULT_TIME_RANGES}
                  customDateRange={customDateRange}
                  onCustomDateRangeChange={setCustomDateRange}
                  className="w-full"
                />
              </div>

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

                {/* Relevance Filter */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    רלוונטיות
                  </label>
                  <RelevanceFilter
                    value={activeRelevance}
                    onChange={setActiveRelevance}
                    relevanceStatuses={relevanceStatuses}
                    showCounts={false}
                    leadCounts={filterCounts?.relevance}
                  />
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Active Filters Summary - Desktop Only */}
      {activeFiltersCount > 0 && (
        <div className="hidden md:block border-t border-slate-100 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">סינונים פעילים:</span>

            {timeRange !== 'current_month' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-md">
                תקופה: {DEFAULT_TIME_RANGES.find(t => t.id === timeRange)?.label || 'מותאם אישית'}
                <button onClick={() => setTimeRange('current_month')} className="mr-1 text-indigo-500 hover:text-indigo-700">×</button>
              </span>
            )}

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

            {activeRelevance !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded-md">
                רלוונטיות: {relevanceStatuses.find(r => r.id === activeRelevance)?.label || 'לא ידוע'}
                <button onClick={() => setActiveRelevance('all')} className="mr-1 text-teal-500 hover:text-teal-700">×</button>
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