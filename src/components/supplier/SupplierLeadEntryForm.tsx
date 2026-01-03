'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LeadInsert } from '@/lib/database.types'
import { Agent } from '@/lib/database.types'

interface SupplierLeadEntryFormProps {
  onClose: () => void
  onLeadAdded: () => void
  currentUser: Agent | null
}

export default function SupplierLeadEntryForm({
  onClose,
  onLeadAdded,
  currentUser
}: SupplierLeadEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    lead_name: '',
    phone: '',
    email: '',
    agent_notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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

      // Prepare lead data with supplier's name as source
      const leadData: LeadInsert = {
        lead_name: formData.lead_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        source: currentUser?.name || 'Manual',
        relevance_status: 'ממתין לבדיקה',
        agent_notes: formData.agent_notes.trim() || null
      }

      // Insert to database
      const { error: insertError } = await (supabase
        .from('leads') as any)
        .insert([leadData])

      if (insertError) throw insertError

      // Success! Close modal and refresh data
      onLeadAdded()
      onClose()

    } catch (err: any) {
      console.error('Error creating lead:', err)
      setError(err.message || 'שגיאה ביצירת הליד')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

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
          dir="ltr"
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
          dir="ltr"
        />
      </div>

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

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={loading}
        >
          ביטול
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'שולח...' : 'הוסף ליד'}
        </button>
      </div>
    </form>
  )
}