'use client'

import React, { useState } from 'react';
import { Lead, Agent } from '@/lib/database.types';
import {
  TrendingUp,
  Users,
  Target,
  Clock,
  Calendar,
  Phone,
  Edit2,
  ChevronDown,
  ChevronUp,
  Banknote
} from 'lucide-react';
import ModernSelector from '../ModernSelector';
import InlineDateTimePicker from '../InlineDateTimePicker';
import { formatPhoneNumber, updateLeadField } from '../shared/leadUtils';

interface AgentDashboardProps {
  leads: Lead[];
  dbAgents: Agent[];
  currentAgent: Agent;
  onRefresh: () => void;
}

export default function AgentDashboard({ leads, dbAgents, currentAgent, onRefresh }: AgentDashboardProps) {
  const [editingField, setEditingField] = useState<{ leadId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());

  // Calculate stats
  const stats = {
    totalLeads: leads.length,
    closedDeals: leads.filter(l => l.status === 'עסקה נסגרה').length,
    inProgress: leads.filter(l => l.status === 'תואם' || l.status === 'במעקב').length,
    scheduled: leads.filter(l => l.meeting_date).length,
    noAnswer: leads.filter(l => l.status === 'אין מענה - לתאם מחדש').length,
    successRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'עסקה נסגרה').length / leads.length) * 100) : 0
  };

  // Status options for the dropdown
  const statusOptions = [
    { id: 'ליד חדש', label: 'ליד חדש', lightBg: 'bg-gray-50', text: 'text-gray-700' },
    { id: 'אין מענה - לתאם מחדש', label: 'אין מענה', lightBg: 'bg-yellow-50', text: 'text-yellow-700' },
    { id: 'תואם', label: 'תואם', lightBg: 'bg-blue-50', text: 'text-blue-700' },
    { id: 'במעקב', label: 'במעקב', lightBg: 'bg-purple-50', text: 'text-purple-700' },
    { id: 'עסקה נסגרה', label: 'עסקה נסגרה', lightBg: 'bg-green-50', text: 'text-green-700' },
    { id: 'התקיימה - כשלון', label: 'כשלון', lightBg: 'bg-red-50', text: 'text-red-700' },
    { id: 'לא רלוונטי', label: 'לא רלוונטי', lightBg: 'bg-gray-50', text: 'text-gray-500' }
  ];

  const startEditing = (leadId: string, field: string, currentValue: string) => {
    setEditingField({ leadId, field });
    setEditingValue(currentValue || '');
  };

  const saveEdit = async () => {
    if (!editingField) return;

    try {
      await updateLeadField(editingField.leadId, editingField.field as any, editingValue);
      setEditingField(null);
      setEditingValue('');
      onRefresh();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleUpdateLeadField = async (leadId: string, field: string, value: any) => {
    try {
      await updateLeadField(leadId, field as any, value);
      onRefresh();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const toggleLeadExpansion = (leadId: string) => {
    const newExpanded = new Set(expandedLeads);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedLeads(newExpanded);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'עסקה נסגרה': return 'bg-green-100 text-green-700';
      case 'תואם': return 'bg-blue-100 text-blue-700';
      case 'במעקב': return 'bg-purple-100 text-purple-700';
      case 'אין מענה - לתאם מחדש': return 'bg-yellow-100 text-yellow-700';
      case 'התקיימה - כשלון': return 'bg-red-100 text-red-700';
      case 'לא רלוונטי': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          שלום {currentAgent.name} 👋
        </h1>
        <p className="text-blue-100">
          הנה סקירת הלידים שלך - כל המידע במקום אחד
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.totalLeads}</span>
          </div>
          <p className="text-sm text-gray-600">סה"כ לידים</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.closedDeals}</span>
          </div>
          <p className="text-sm text-gray-600">עסקאות נסגרו</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.inProgress}</span>
          </div>
          <p className="text-sm text-gray-600">בתהליך</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.scheduled}</span>
          </div>
          <p className="text-sm text-gray-600">פגישות מתוזמנות</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.noAnswer}</span>
          </div>
          <p className="text-sm text-gray-600">אין מענה</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.successRate}%</span>
          </div>
          <p className="text-sm text-gray-600">אחוז הצלחה</p>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            הלידים שלי ({leads.length})
          </h2>
        </div>

        {leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600 font-medium">אין לידים מוקצים כרגע</p>
            <p className="text-gray-500 text-sm mt-2">לידים חדשים יופיעו כאן כשיוקצו לך</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leads.map((lead) => {
              const isExpanded = expandedLeads.has(lead.id);
              return (
                <div key={lead.id} className="hover:bg-gray-50 transition-colors">
                  {/* Main Lead Row */}
                  <div className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {/* Lead Name - Editable */}
                        <div className="mb-2">
                          {editingField?.leadId === lead.id && editingField?.field === 'lead_name' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-700">✓</button>
                              <button onClick={cancelEdit} className="text-red-600 hover:text-red-700">✕</button>
                            </div>
                          ) : (
                            <h3
                              className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 inline-flex items-center gap-2"
                              onClick={() => startEditing(lead.id, 'lead_name', lead.lead_name)}
                            >
                              {lead.lead_name}
                              <Edit2 className="w-4 h-4 opacity-50" />
                            </h3>
                          )}
                        </div>

                        {/* Phone - Editable */}
                        <div className="mb-2">
                          {editingField?.leadId === lead.id && editingField?.field === 'phone' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="tel"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                autoFocus
                              />
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-700">✓</button>
                              <button onClick={cancelEdit} className="text-red-600 hover:text-red-700">✕</button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-blue-600"
                              onClick={() => startEditing(lead.id, 'phone', lead.phone)}
                            >
                              <Phone className="w-4 h-4" />
                              <span className="font-mono">{formatPhoneNumber(lead.phone)}</span>
                              <Edit2 className="w-3 h-3 opacity-50" />
                            </div>
                          )}
                        </div>

                        {/* Quick Info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span>נוצר: {new Date(lead.created_at).toLocaleDateString('he-IL')}</span>
                          {lead.meeting_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              פגישה: {new Date(lead.meeting_date).toLocaleDateString('he-IL')}
                            </span>
                          )}
                          {lead.price && (
                            <span className="flex items-center gap-1">
                              <Banknote className="w-3 h-3" />
                              ₪{lead.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status and Expand Button */}
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status || 'ליד חדש'}
                        </span>
                        <button
                          onClick={() => toggleLeadExpansion(lead.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status Selector */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">סטטוס</label>
                          <ModernSelector
                            value={lead.status || ''}
                            onChange={(value) => handleUpdateLeadField(lead.id, 'status', value)}
                            options={statusOptions}
                            placeholder="בחר סטטוס"
                            compact
                          />
                        </div>

                        {/* Meeting Date */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">מועד פגישה</label>
                          <InlineDateTimePicker
                            value={lead.meeting_date}
                            onChange={(value) => handleUpdateLeadField(lead.id, 'meeting_date', value)}
                          />
                        </div>

                        {/* Price */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">מחיר</label>
                          {editingField?.leadId === lead.id && editingField?.field === 'price' ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => startEditing(lead.id, 'price', String(lead.price || '0'))}
                              className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-sm transition-colors text-right"
                            >
                              ₪{lead.price?.toLocaleString() || '0'}
                            </button>
                          )}
                        </div>

                        {/* Notes - Full Width */}
                        <div className="md:col-span-2 lg:col-span-4">
                          <label className="text-xs text-gray-500 mb-1 block">הערות</label>
                          {editingField?.leadId === lead.id && editingField?.field === 'agent_notes' ? (
                            <textarea
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              autoFocus
                              onBlur={saveEdit}
                            />
                          ) : (
                            <button
                              onClick={() => startEditing(lead.id, 'agent_notes', lead.agent_notes || '')}
                              className="w-full px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded text-sm transition-colors text-right min-h-[60px]"
                            >
                              {lead.agent_notes || 'לחץ להוספת הערות...'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}