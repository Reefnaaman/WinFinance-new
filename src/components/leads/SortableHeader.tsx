'use client'

import React from 'react'

interface SortableHeaderProps {
  label: string
  field: 'status' | 'date' | 'name' | 'agent' | 'relevance' | 'source'
  currentSort: 'status' | 'date' | 'name' | 'agent' | 'relevance' | 'source'
  currentOrder: 'asc' | 'desc'
  onSort: (field: 'status' | 'date' | 'name' | 'agent' | 'relevance' | 'source') => void
  className?: string
}

export default function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className = ""
}: SortableHeaderProps) {
  const isActive = currentSort === field

  const handleClick = () => {
    onSort(field)
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 text-right hover:text-slate-900 transition-colors group ${className} ${
        isActive ? 'text-blue-600 font-semibold' : 'text-slate-700 font-semibold'
      }`}
    >
      <span>{label}</span>
      <div className="flex flex-col">
        {/* Up arrow (ascending) */}
        <svg
          className={`w-3 h-3 transition-colors ${
            isActive && currentOrder === 'asc'
              ? 'text-blue-600'
              : isActive
                ? 'text-slate-300'
                : 'text-slate-400 group-hover:text-slate-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        {/* Down arrow (descending) */}
        <svg
          className={`w-3 h-3 -mt-1 transition-colors ${
            isActive && currentOrder === 'desc'
              ? 'text-blue-600'
              : isActive
                ? 'text-slate-300'
                : 'text-slate-400 group-hover:text-slate-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  )
}