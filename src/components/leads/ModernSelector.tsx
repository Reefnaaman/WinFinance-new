'use client'

import React, { useState } from 'react';

interface SelectorOption {
  id: string;
  label: string;
  color?: string;
  lightBg?: string;
  text?: string;
  icon?: string;
}

interface ModernSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectorOption[];
  placeholder?: string;
  compact?: boolean;
}

/**
 * Modern 2025 Selector Component
 * No dropdowns, no portals, no positioning issues
 * Clean inline chip selection with smooth animations
 */
export default function ModernSelector({
  value,
  onChange,
  options,
  placeholder = "בחר",
  compact = false
}: ModernSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative inline-block">
      {/* Button - always visible */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`
          inline-flex items-center gap-1 px-3 py-1.5
          rounded-full text-xs font-medium
          border transition-all duration-200
          hover:shadow-md hover:scale-105 active:scale-95
          ${selectedOption?.lightBg || 'bg-white'}
          ${selectedOption?.text || 'text-slate-700'}
          ${selectedOption ? 'border-current/30' : 'border-slate-300'}
        `}
      >
        {selectedOption?.icon && <span>{selectedOption.icon}</span>}
        <span>{selectedOption?.label || placeholder}</span>
        <svg className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown - only visible when open */}
      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />

          {/* Options container - positioned below the button */}
          <div className={`
            absolute top-full mt-1 left-0 z-[101]
            ${compact ? 'flex flex-wrap gap-1' : 'grid grid-cols-2 gap-1.5'}
            p-2 bg-white rounded-lg shadow-xl border border-slate-200
            transition-all duration-200 transform origin-top
            max-w-[240px] min-w-[200px]
          `} style={{ position: 'absolute' }}>
            {options.map((option) => (
              <button
                key={option.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-150
                  hover:scale-105 active:scale-95
                  ${value === option.id
                    ? `${option.lightBg || 'bg-blue-100'} ${option.text || 'text-blue-700'} ring-2 ring-offset-1 ring-current/30`
                    : `${option.lightBg || 'bg-slate-100'} ${option.text || 'text-slate-700'} hover:shadow-md`
                  }
                `}
              >
                {option.icon && <span className="mr-1">{option.icon}</span>}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}