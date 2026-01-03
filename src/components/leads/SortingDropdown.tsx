'use client'

import React, { useRef, useEffect } from 'react';
import Portal from '../ui/Portal';

interface SortingDropdownProps {
  sortBy: 'status' | 'date' | 'name' | 'agent';
  setSortBy: (sort: 'status' | 'date' | 'name' | 'agent') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  mobileStyle?: 'purple';
}

export default function SortingDropdown({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  mobileStyle
}: SortingDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sortOptions = [
    { value: 'status', label: 'סטטוס' },
    { value: 'date', label: 'תאריך' },
    { value: 'name', label: 'שם הליד' },
    { value: 'agent', label: 'סוכן' }
  ];

  const selectedOption = sortOptions.find(opt => opt.value === sortBy);

  // Handle dropdown toggle
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Mobile purple button style
  if (mobileStyle === 'purple') {
    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-purple-200 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span>מיון על פי</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <Portal triggerElement={buttonRef.current} placement="bottom-start">
            <div className="bg-white border border-purple-200 rounded-lg shadow-lg min-w-[180px]">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value as any);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-right hover:bg-purple-50 transition-colors ${
                    sortBy === option.value ? 'bg-purple-100 text-purple-700' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Portal>
        )}
      </div>
    );
  }

  // Default desktop style
  return (
    <div className="flex items-center gap-2">
      {/* Main Dropdown Button */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className="px-3 py-2.5 text-sm text-right bg-white border border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 h-10 flex items-center justify-between gap-2 min-w-[180px]"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span className="text-slate-700">{selectedOption?.label}</span>
          </div>

          {/* Dropdown Arrow */}
          <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <Portal triggerElement={buttonRef.current} placement="bottom-start">
            <div
              className="bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px]"
            >
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value as any);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-right hover:bg-slate-50 transition-colors ${
                    sortBy === option.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Portal>
        )}
      </div>

      {/* Sort Direction Toggle Button - Separated like mobile */}
      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
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
  );
}