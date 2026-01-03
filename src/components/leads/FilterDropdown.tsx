'use client'

import React, { useState, useRef, useEffect } from 'react';
import Portal from '../ui/Portal';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Filter option definition
 */
export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  lightBg?: string;
  text?: string;
  count?: number;
}

/**
 * FilterDropdown component props
 * Reusable dropdown for Agent, Status, and Source filters
 */
export interface FilterDropdownProps {
  /** Current selected filter value */
  value: string;
  /** Function to handle filter value changes */
  onChange: (value: string) => void;
  /** Array of available filter options */
  options: FilterOption[];
  /** Dropdown placeholder text */
  placeholder?: string;
  /** Dropdown label for accessibility */
  label: string;
  /** Optional CSS class name */
  className?: string;
  /** Show option counts if available */
  showCounts?: boolean;
  /** Allow clearing/resetting filter */
  allowClear?: boolean;
  /** Dropdown width variant */
  width?: 'sm' | 'md' | 'lg' | 'full';
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * FilterDropdown Component
 *
 * PURPOSE: Reusable dropdown filter component for LeadsPage
 * FEATURES:
 * - Responsive design with proper touch targets
 * - RTL support for Hebrew interface
 * - Option counts and visual indicators
 * - Keyboard navigation support
 * - Click outside to close functionality
 * - Proper accessibility attributes
 *
 * @param props FilterDropdownProps
 * @returns JSX.Element
 */
export default function FilterDropdown({
  value,
  onChange,
  options,
  placeholder = "בחר...",
  label,
  showCounts = false,
  allowClear = true
}: FilterDropdownProps) {

  // ============================================================================
  // STATE & REFS
  // ============================================================================

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('all');
    setIsOpen(false);
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedOption = options.find(opt => opt.id === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;
  const isAllSelected = value === 'all';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative" style={{ width: '128px' }}>

      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleDropdown}
        className={`
          px-3 py-2.5 text-sm text-right bg-white border border-slate-300 rounded-lg
          hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-all duration-200 h-10 flex items-center justify-between w-full
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
        `}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >

        {/* Selected Option Display */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`truncate ${isAllSelected ? 'text-slate-500' : 'text-slate-900'}`}>
            {displayText}
          </span>
          {selectedOption?.count !== undefined && showCounts && (
            <span className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
              {selectedOption.count}
            </span>
          )}
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Using Portal to escape ALL stacking contexts */}
      {isOpen && (
        <Portal triggerElement={buttonRef.current} placement="bottom-start">
          <div
            ref={dropdownRef}
            className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-visible"
            style={{
              width: label === 'סינון לפי סטטוס' ? '220px' : '160px',
              height: label === 'סינון לפי סטטוס' ? 'auto' : 'auto',
              maxHeight: label === 'סינון לפי סטטוס' ? 'none' : '240px'
            }}
          >
              {/* Clear Option */}
              {allowClear && value !== 'all' && (
                <div className="border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full px-3 py-2 text-sm text-right text-slate-500 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span>✕</span>
                    <span>הסר סינון</span>
                  </button>
                </div>
              )}

              {/* Filter Options */}
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option.id)}
                  className={`
                    w-full px-3 py-2 text-sm text-right hover:bg-slate-50 flex items-center justify-between
                    transition-colors duration-150
                    ${value === option.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}
                  `}
                  role="option"
                  aria-selected={value === option.id}
                >
                  {/* Option Content */}
                  <div className="flex items-center gap-2">
                    <span className="truncate">{option.label}</span>
                  </div>

                  {/* Option Count */}
                  {option.count !== undefined && showCounts && (
                    <span className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                      {option.count}
                    </span>
                  )}

                  {/* Selection Indicator */}
                  {value === option.id && (
                    <span className="text-blue-500">✓</span>
                  )}
                </button>
              ))}

              {/* Empty State */}
              {options.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500 text-center">
                  אין אפשרויות זמינות
                </div>
              )}
          </div>
        </Portal>
      )}
    </div>
  );
}