'use client'

import React from 'react';
import { Lead, Agent } from '@/lib/database.types';
import { Phone, Calendar, Clock, Banknote } from 'lucide-react';

interface SupplierLeadsTableProps {
  leads: Lead[];
  dbAgents: Agent[];
}

export default function SupplierLeadsTable({ leads, dbAgents }: SupplierLeadsTableProps) {
  // Status configurations
  const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
    'ליד חדש': { color: 'text-indigo-700', bgColor: 'bg-indigo-50', label: 'ליד חדש' },
    'תואם': { color: 'text-purple-700', bgColor: 'bg-purple-50', label: 'תואם' },
    'אין מענה - לתאם מחדש': { color: 'text-yellow-700', bgColor: 'bg-yellow-50', label: 'אין מענה' },
    'התקיימה - כשלון': { color: 'text-red-700', bgColor: 'bg-red-50', label: 'כשלון' },
    'במעקב': { color: 'text-blue-700', bgColor: 'bg-blue-50', label: 'במעקב' },
    'עסקה נסגרה': { color: 'text-green-700', bgColor: 'bg-green-50', label: 'נסגרה' },
    'לא רלוונטי': { color: 'text-gray-700', bgColor: 'bg-gray-50', label: 'לא רלוונטי' }
  };

  const getStatusInfo = (status: string | null) => {
    return statusConfig[status || 'ליד חדש'] || statusConfig['ליד חדש'];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatMeetingDateTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }),
      time: date.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">אין לידים להצגה</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">שם הליד</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">טלפון</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">סטטוס</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מועד פגישה</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">תאריך יצירה</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מחיר</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead, index) => {
              const statusInfo = getStatusInfo(lead.status);
              const meetingInfo = formatMeetingDateTime(lead.meeting_date);
              return (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 transition-colors animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.lead_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span dir="ltr">{lead.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {meetingInfo ? (
                      <div className="text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">{meetingInfo.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{meetingInfo.time}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.status === 'עסקה נסגרה' && lead.price ? (
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <Banknote className="w-4 h-4" />
                        <span>₪{Number(lead.price).toLocaleString('he-IL')}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {leads.map((lead, index) => {
          const statusInfo = getStatusInfo(lead.status);
          const meetingInfo = formatMeetingDateTime(lead.meeting_date);
          return (
            <div
              key={lead.id}
              className="p-4 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{lead.lead_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Phone className="w-3 h-3" />
                    <span dir="ltr">{lead.phone}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {meetingInfo ? (
                  <div className="text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">{meetingInfo.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{meetingInfo.time}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs">אין פגישה</div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(lead.created_at)}</span>
                </div>
              </div>

              {lead.status === 'עסקה נסגרה' && lead.price && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <Banknote className="w-4 h-4" />
                    <span>₪{Number(lead.price).toLocaleString('he-IL')}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}