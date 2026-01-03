'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DatePickerProps {
  value: string | null
  onChange: (value: string | null) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  disabled?: boolean
}

export default function DatePicker({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = 'בחר תאריך ושעה...',
  className = '',
  autoFocus = false,
  disabled = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle client-side mounting for portal rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Parse initial value or set today's date
  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setSelectedDate(date.toISOString().split('T')[0])
      setSelectedTime(date.toTimeString().slice(0, 5))
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    } else if (isOpen) {
      // Default to today when opening without a value
      const today = new Date()
      setSelectedDate(today.toISOString().split('T')[0])
      setSelectedTime('10:00') // Default time
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    } else {
      setSelectedDate('')
      setSelectedTime('')
    }
  }, [value, isOpen])

  useEffect(() => {
    if (autoFocus) {
      setIsOpen(true)
    }
  }, [autoFocus])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSave = () => {
    if (selectedDate && selectedTime) {
      const combinedDateTime = new Date(`${selectedDate}T${selectedTime}`)
      onChange(combinedDateTime.toISOString())
    } else {
      onChange(null)
    }
    setIsOpen(false)
    onSave?.()
  }

  const handleCancel = () => {
    if (value) {
      const date = new Date(value)
      setSelectedDate(date.toISOString().split('T')[0])
      setSelectedTime(date.toTimeString().slice(0, 5))
    } else {
      setSelectedDate('')
      setSelectedTime('')
    }
    setIsOpen(false)
    onCancel?.()
  }

  const formatDisplayDate = (isoString: string | null) => {
    if (!isoString) return null
    try {
      const date = new Date(isoString)
      return {
        date: date.toLocaleDateString('he-IL', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        }),
        time: date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        dayName: date.toLocaleDateString('he-IL', { weekday: 'long' })
      }
    } catch {
      return null
    }
  }

  // Time presets for quick selection
  const timePresets = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ]

  // Calendar generation
  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay()

    const days = []
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isPast = dateStr < todayStr
      const isSelected = selectedDate === dateStr
      const isToday = dateStr === todayStr

      days.push({
        day,
        dateStr,
        isPast,
        isSelected,
        isToday
      })
    }

    return days
  }

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ]

  const displayDate = formatDisplayDate(value)
  const days = generateCalendar()

  return (
    <div ref={containerRef} className="relative">
      {!isOpen && !autoFocus ? (
        <div
          className={`cursor-pointer hover:bg-slate-50 rounded-xl p-3 min-h-[50px] flex items-center transition-all duration-200 border border-slate-200 hover:border-blue-300 hover:shadow-md ${
            disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:border-slate-200 hover:shadow-none' : ''
          } ${className}`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          {displayDate ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                📅
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">
                  {displayDate.dayName}, {displayDate.date}
                </span>
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  ⏰ {displayDate.time}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl flex items-center justify-center text-white shadow-md">
                📅
              </div>
              <span className="text-sm text-slate-500 font-medium">{placeholder}</span>
            </div>
          )}
        </div>
      ) : mounted ? createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999998, backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={handleCancel}></div>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" style={{ minWidth: '380px', zIndex: 99999999 }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📅 תיאום שיחה</h3>
              <button
                onClick={handleCancel}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Date and Time Selection - Desktop Style */}
            {!isMobile ? (
              <>
                {/* Date Row */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-lg">📅</span> בחירת תאריך
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  ‹
                </button>
                <h4 className="text-lg font-bold text-slate-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  ›
                </button>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-slate-600 p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => day && !day.isPast && setSelectedDate(day.dateStr)}
                    disabled={!day || day.isPast}
                    className={`
                      h-10 rounded-lg text-sm font-medium transition-all duration-200 relative
                      ${!day ? 'invisible' :
                        day.isPast ? 'text-slate-300 cursor-not-allowed' :
                        day.isSelected ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md transform scale-105' :
                        day.isToday ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' :
                        'text-slate-700 hover:bg-slate-100'}
                    `}
                  >
                    {day?.day}
                    {day?.isToday && <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>}
                  </button>
                ))}
              </div>
                  </div>
                </div>

                {/* Time Row */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-lg">⏰</span> בחירת שעה
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-3">
                    {/* Quick time presets - Desktop only */}
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {timePresets.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${selectedTime === time
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }
                          `}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    {/* Custom time input */}
                    <div className="pt-3 border-t border-slate-200">
                      <label className="block text-sm font-medium text-slate-600 mb-2">או הזן שעה מותאמת:</label>
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Mobile Layout - Simplified */
              <>
                {/* Date selection for Mobile */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-lg">📅</span> בחירת תאריך
                  </h4>

                  {/* Calendar navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      ‹
                    </button>
                    <h4 className="text-base font-bold text-slate-900">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      ›
                    </button>
                  </div>

                  {/* Days of week */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-slate-600 p-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => day && !day.isPast && setSelectedDate(day.dateStr)}
                        disabled={!day || day.isPast}
                        className={`
                          h-9 rounded-lg text-xs font-medium transition-all duration-200 relative
                          ${!day ? 'invisible' :
                            day.isPast ? 'text-slate-300 cursor-not-allowed' :
                            day.isSelected ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' :
                            day.isToday ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                            'text-slate-700 hover:bg-slate-100'}
                        `}
                      >
                        {day?.day}
                        {day?.isToday && <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-blue-500 rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time selection for Mobile - Direct input only */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-lg">⏰</span> בחירת שעה
                  </h4>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ביטול
              </button>
              {!isMobile && (
                <button
                  onClick={() => {
                    setSelectedDate('')
                    setSelectedTime('')
                    onChange(null)
                    setIsOpen(false)
                    onSave?.()
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  מחק תאריך
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                שמור תאריך
              </button>
            </div>
          </div>
        </div>
        </>,
        document.body
      ) : null}
    </div>
  )
}