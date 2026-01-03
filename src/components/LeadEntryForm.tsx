'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { LeadInsert } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
// Temporarily revert to original components to fix dashboard
// import { Button, Input, Modal } from '@/design-system/components'
// import { validateLeadForm, formatIsraeliPhone } from '@/design-system/utils/validation'

interface LeadEntryFormProps {
  onLeadCreated?: () => void
}

export default function LeadEntryForm({ onLeadCreated }: LeadEntryFormProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  // Removed field errors for now to restore original functionality

  // Set source based on user role - ALWAYS get fresh value
  const getDefaultSource = () => {
    if (user?.role === 'lead_supplier') {
      return user.name // Use the lead supplier's name as source
    }
    return 'Manual'
  }

  const [formData, setFormData] = useState({
    lead_name: '',
    phone: '',
    email: '',
    source: '', // Don't cache the source here
    agent_notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.lead_name.trim() || !formData.phone.trim()) {
        throw new Error('שם וטלפון הם שדות חובה')
      }

      // Phone validation (Israeli format)
      const phoneRegex = /^0[0-9]{1,2}-?[0-9]{7,8}$/
      if (!phoneRegex.test(formData.phone.replace(/[-\s]/g, ''))) {
        throw new Error('מספר טלפון לא תקין')
      }

      // Email validation (if provided)
      if (formData.email && !formData.email.includes('@')) {
        throw new Error('כתובת אימייל לא תקינה')
      }

      // Prepare lead data - ALWAYS use fresh source value
      const leadData: LeadInsert = {
        lead_name: formData.lead_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        source: getDefaultSource(), // Always get fresh source, not cached
        relevance_status: 'ממתין לבדיקה', // Always starts as pending review
        agent_notes: formData.agent_notes.trim() || null
      }

      // Insert to database
      const { error: insertError } = await (supabase
        .from('leads') as any)
        .insert([leadData])

      if (insertError) throw insertError

      // Success!
      setSuccess(true)

      // Reset form
      setFormData({
        lead_name: '',
        phone: '',
        email: '',
        source: '', // Don't cache source
        agent_notes: ''
      })

      // Notify parent component immediately
      if (onLeadCreated) {
        onLeadCreated()
      }

      // Clear success message after 2 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 2000)

    } catch (err: any) {
      console.error('Error creating lead:', err)
      setError(err.message || 'שגיאה ביצירת הליד')
    } finally {
      setLoading(false)
    }
  }

  // Don't render portal on server side
  if (typeof window === 'undefined') return null;

  return (
    <>
      {/* Modal - Using Portal to render outside of parent containers */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">הוספת ליד חדש</h2>
              <button
                onClick={() => {
                  if (onLeadCreated) {
                    onLeadCreated()
                  }
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lead_name}
                  onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ישראל ישראלי"
                  required
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  טלפון <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="052-1234567"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="israel@example.com"
                />
              </div>

              {/* Source Field - Only show for non-lead suppliers */}
              {user?.role !== 'lead_supplier' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מקור הליד
                  </label>
                  <select
                    value={formData.source || 'Manual'}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadInsert['source'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Manual">הזנה ידנית</option>
                    <option value="Email">אימייל</option>
                    <option value="Other">אחר</option>
                  </select>
                </div>
              )}

              {/* Notes Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הערות
                </label>
                <textarea
                  value={formData.agent_notes}
                  onChange={(e) => setFormData({ ...formData, agent_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="הערות נוספות..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-600 text-sm">✅ הליד נוסף בהצלחה!</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'שומר...' : 'הוסף ליד'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                  if (onLeadCreated) {
                    onLeadCreated()
                  }
                }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}