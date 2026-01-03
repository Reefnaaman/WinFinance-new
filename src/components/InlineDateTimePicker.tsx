'use client'

import React, { useState, useRef, useEffect } from 'react'
import Portal from './ui/Portal'

interface InlineDateTimePickerProps {
  value: string | null
  onChange: (value: string | null) => void
  onSave?: () => void
  onCancel?: () => void
  disabled?: boolean
  className?: string
}

export default function InlineDateTimePicker({
  value,
  onChange,
  onSave,
  onCancel,
  disabled = false,
  className = ''
}: InlineDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const [tempDate, setTempDate] = useState('')
  const [tempTime, setTempTime] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setTempValue(date.toISOString().slice(0, 16))
      setTempDate(date.toISOString().split('T')[0])
      setTempTime(date.toTimeString().slice(0, 5))
    } else if (isOpen) {
      // Default to today when opening without value
      const today = new Date()
      const todayStr = today.toISOString().slice(0, 16)
      setTempValue(todayStr)
      setTempDate(today.toISOString().split('T')[0])
      setTempTime('10:00')
    } else {
      setTempValue('')
      setTempDate('')
      setTempTime('')
    }
  }, [value, isOpen])

  const formatDisplay = (isoString: string | null) => {
    if (!isoString) return 'תאריך'
    try {
      const date = new Date(isoString)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${day}/${month} ${hour}:${minute}`
    } catch {
      return 'תאריך'
    }
  }

  const handleSave = () => {
    if (tempDate && tempTime) {
      const combinedDateTime = new Date(`${tempDate}T${tempTime}`)
      onChange(combinedDateTime.toISOString())
    } else if (tempValue) {
      onChange(new Date(tempValue).toISOString())
    } else {
      onChange(null)
    }
    setIsOpen(false)
    onSave?.()
  }

  const handleCancel = () => {
    if (value) {
      const date = new Date(value)
      setTempValue(date.toISOString().slice(0, 16))
    } else {
      setTempValue('')
    }
    setIsOpen(false)
    onCancel?.()
  }

  const handleClear = () => {
    setTempValue('')
    onChange(null)
    setIsOpen(false)
    onSave?.()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-blue-200 hover:shadow-sm transition-all duration-200 bg-blue-50 text-blue-700 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'
        }`}
      >
        {formatDisplay(value)}
        <svg className="w-3 h-3 mr-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && mounted && (
        <Portal
          triggerElement={buttonRef.current}
          placement="bottom-start"
        >
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 min-w-[280px]">
            <div className="space-y-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  📅 תאריך
                </label>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => {
                    setTempDate(e.target.value)
                    if (e.target.value && tempTime) {
                      setTempValue(`${e.target.value}T${tempTime}`)
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  dir="ltr"
                />
              </div>

              {/* Time Input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  ⏰ שעה
                </label>
                <input
                  type="time"
                  value={tempTime}
                  onChange={(e) => {
                    setTempTime(e.target.value)
                    if (tempDate && e.target.value) {
                      setTempValue(`${tempDate}T${e.target.value}`)
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                >
                  שמור
                </button>
                {tempValue && (
                  <button
                    onClick={handleClear}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    נקה
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCancel}
        />
      )}
    </div>
  )
}