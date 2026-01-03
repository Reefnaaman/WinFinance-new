'use client'

import React, { useState } from 'react';
import LeadEntryForm from '../LeadEntryForm';
import CSVImport from '../CSVImport';
import CSVExport from '../CSVExport';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * ActionButtons component props
 */
export interface ActionButtonsProps {
  /** Function to refresh data after operations */
  fetchData: () => Promise<void>;
  /** Whether user can create leads */
  canCreateLeads: () => boolean;
  /** Optional CSS class name */
  className?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Whether to hide export button (for agents) */
  hideExport?: boolean;
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * ActionButtons Component
 *
 * PURPOSE: Action buttons for CSV Import/Export and Lead Entry
 * FEATURES:
 * - Lead Entry Form modal
 * - CSV Import functionality
 * - CSV Export functionality
 * - Responsive design with compact mode
 * - Proper permission checking
 * - Modal state management
 *
 * @param props ActionButtonsProps
 * @returns JSX.Element
 */
export default function ActionButtons({
  fetchData,
  canCreateLeads,
  className = "",
  compact = false,
  hideExport = false
}: ActionButtonsProps) {

  // ============================================================================
  // STATE
  // ============================================================================

  const [showLeadEntryForm, setShowLeadEntryForm] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLeadFormComplete = () => {
    setShowLeadEntryForm(false);
    fetchData(); // Refresh data after lead creation
  };

  const handleCSVImportComplete = () => {
    setShowCSVImport(false);
    fetchData(); // Refresh data after CSV import
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Action Buttons */}
      <div className={`flex items-center gap-2 ${className}`}>

        {/* CSV Export Button - Hidden for agents */}
        {!hideExport && <CSVExport />}

        {/* CSV Import Button - Only if user can create leads - Desktop only */}
        {canCreateLeads() && (
          <button
            onClick={() => setShowCSVImport(true)}
            className={`
              ${compact ? 'px-2' : 'px-3'} h-10 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300
              transition-all duration-200 items-center gap-1 text-xs md:text-sm font-medium
              rounded-lg hover:shadow-sm whitespace-nowrap hidden md:flex
            `}
            title="ייבוא CSV"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span>ייבוא</span>
          </button>
        )}

        {/* Lead Entry Button - Only if user can create leads */}
        {canCreateLeads() && (
          <button
            onClick={() => setShowLeadEntryForm(true)}
            className={`
              ${compact ? 'px-2' : 'px-3'} h-10 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300
              transition-all duration-200 flex items-center gap-1 text-xs md:text-sm font-medium
              rounded-lg hover:shadow-sm whitespace-nowrap
            `}
            title="הוספת ליד חדש"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>הוספת ליד</span>
          </button>
        )}
      </div>

      {/* Lead Entry Form Modal */}
      {showLeadEntryForm && (
        <LeadEntryForm onLeadCreated={handleLeadFormComplete} />
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImport onImportComplete={handleCSVImportComplete} />
      )}
    </>
  );
}