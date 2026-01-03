'use client'

import React, { useState, useCallback, useRef } from 'react';
import { Lead, Agent } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import LeadEntryForm from '../LeadEntryForm';
import CSVImport from '../CSVImport';
import CSVExport from '../CSVExport';
import DatePicker from '../DatePicker';
import InlineDateTimePicker from '../InlineDateTimePicker';
import FiltersBar from './FiltersBar';
import ActionButtons from './ActionButtons';
import ModernSelector from './ModernSelector';
import SortingDropdown from './SortingDropdown';
import { StatusOption } from './StatusFilter';
import { SourceOption } from './SourceFilter';
import {
  formatPhoneNumber,
  updateLeadField,
  deleteLead,
  getStatusInfo,
  getAgentInfo,
  getSourceInfo
} from '../shared/leadUtils';

interface LeadsPageProps {
  filteredLeads: Lead[];
  dbAgents: Agent[];
  sources: SourceOption[];
  statuses: StatusOption[];
  relevanceStatuses: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeAgent: string;
  setActiveAgent: (agentId: string) => void;
  activeStatus: string;
  setActiveStatus: (status: string) => void;
  activeSource: string;
  setActiveSource: (source: string) => void;
  filterCounts?: {
    agents: Record<string, number>;
    statuses: Record<string, number>;
    sources: Record<string, number>;
  };
  fetchData: () => Promise<void>;
  canCreateLeads: () => boolean;
  swipedCard: string | null;
  setSwipedCard: (id: string | null) => void;
  swipeStart: { x: number; y: number } | null;
  setSwipeStart: (pos: { x: number; y: number } | null) => void;
  sortBy: 'status' | 'date' | 'name' | 'agent';
  setSortBy: (sort: 'status' | 'date' | 'name' | 'agent') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  isRefreshing: boolean;
  pullDistance: number;
  handleRefresh: () => Promise<void>;
  setPullDistance: (distance: number) => void;
}

export default function LeadsPage({
  filteredLeads,
  dbAgents,
  sources,
  statuses,
  relevanceStatuses,
  searchTerm,
  setSearchTerm,
  activeAgent,
  setActiveAgent,
  activeStatus,
  setActiveStatus,
  activeSource,
  setActiveSource,
  filterCounts,
  fetchData,
  canCreateLeads,
  swipedCard,
  setSwipedCard,
  swipeStart,
  setSwipeStart,
  isRefreshing,
  pullDistance,
  handleRefresh,
  setPullDistance,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder
}: LeadsPageProps) {
  const { user } = useAuth();

  // Click-to-edit state management
  const [editingField, setEditingField] = useState<{ leadId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');


  // Mobile expand/collapse state
  const [expandedMobileCards, setExpandedMobileCards] = useState<Set<string>>(new Set());

  // Date picker state for meeting dates
  const [dateTimeModal, setDateTimeModal] = useState<{
    leadId: string;
    show: boolean;
    currentValue: string
  } | null>(null);

  const toggleMobileCard = (leadId: string) => {
    setExpandedMobileCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

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
      await fetchData();
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
      // If assigning an agent to a lead that's waiting for approval, auto-update relevancy to "relevant"
      if (field === 'assigned_agent_id' && value) {
        const currentLead = filteredLeads.find(lead => lead.id === leadId);
        if (currentLead?.relevance_status === 'ממתין לבדיקה') {
          // Update both agent assignment and relevancy status
          await updateLeadField(leadId, 'assigned_agent_id', value);
          await updateLeadField(leadId, 'relevance_status', 'רלוונטי');
        } else {
          // Just update the agent assignment
          await updateLeadField(leadId, field as any, value);
        }
      } else {
        // Regular field update
        await updateLeadField(leadId, field as any, value);
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הליד הזה?')) {
      return;
    }

    try {
      await deleteLead(leadId);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Main Content */}
      <div className="w-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-3 animate-fade-in-scale animation-delay-100">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">לידים</h2>
        </div>

        {/* Agent Mini Dashboard - Only show for agents */}
        {user?.role === 'agent' && (() => {
          const agentLeads = filteredLeads;
          const totalAssigned = agentLeads.length;
          const dealsSigned = agentLeads.filter(l => l.status === 'עסקה נסגרה').length;
          const inFollowUp = agentLeads.filter(l => l.status === 'במעקב').length;
          const noAnswer = agentLeads.filter(l => l.status === 'אין מענה - לתאם מחדש').length;
          const failed = agentLeads.filter(l => l.status === 'התקיימה - כשלון').length;

          const successRate = totalAssigned > 0 ? Math.round((dealsSigned / totalAssigned) * 100) : 0;
          const responseRate = totalAssigned > 0 ? Math.round(((totalAssigned - noAnswer) / totalAssigned) * 100) : 0;

          return (
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 text-white shadow-lg animate-fade-in-up animation-delay-200">
              <div className="mb-4">
                <h3 className="text-lg md:text-2xl font-bold mb-1">היי {user.name}! 👋</h3>
                <p className="text-blue-100 text-sm">הנה הסיכום שלך - כל הלידים והעדכונים במקום אחד</p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
                <div className={`bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4`}>
                  <p className="text-blue-100 text-xs md:text-sm">לידים שויכו</p>
                  <p className="text-xl md:text-3xl font-bold">{totalAssigned}</p>
                </div>
                <div className={`bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4`}>
                  <p className="text-blue-100 text-xs md:text-sm">עסקאות נחתמו</p>
                  <p className="text-xl md:text-3xl font-bold text-green-300">{dealsSigned}</p>
                </div>
                <div className={`bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4`}>
                  <p className="text-blue-100 text-xs md:text-sm">שיעור הצלחה</p>
                  <p className="text-xl md:text-3xl font-bold text-yellow-300">{successRate}%</p>
                </div>
                <div className={`bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4`}>
                  <p className="text-blue-100 text-xs md:text-sm">שיעור מענה</p>
                  <p className="text-xl md:text-3xl font-bold text-cyan-300">{responseRate}%</p>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4 text-xs md:text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-300 rounded-full"></div>
                  <span>במעקב: {inFollowUp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-300 rounded-full"></div>
                  <span>אין מענה: {noAnswer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-red-300 rounded-full"></div>
                  <span>נכשלו: {failed}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Enhanced Filters Bar */}
        <div className="animate-fade-in-up animation-delay-300">
        <FiltersBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeAgent={activeAgent}
          setActiveAgent={setActiveAgent}
          activeStatus={activeStatus}
          setActiveStatus={setActiveStatus}
          activeSource={activeSource}
          setActiveSource={setActiveSource}
          agents={dbAgents}
          statuses={statuses}
          sources={sources}
          showCounts={true}
          filterCounts={filterCounts}
          className="mb-4 md:mb-6"
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          totalLeads={filteredLeads.length}
        >
          <ActionButtons
            fetchData={fetchData}
            canCreateLeads={canCreateLeads}
            compact={true}
            hideExport={user?.role === 'agent'}
          />
        </FiltersBar>
        </div>

        {/* Desktop Sticky Header - Outside any overflow containers */}
        <div className="hidden md:block sticky top-[73px] z-30 bg-slate-50 border-x border-b border-slate-200 shadow-sm animate-fade-in-up animation-delay-400">
          <div className="px-4 py-4">
            {user?.role === 'agent' ? (
              // Agent view - simplified columns
              <div className="grid grid-cols-8 gap-2 items-center text-sm font-semibold text-slate-700">
                <div className="col-span-2">שם הליד</div>
                <div className="col-span-1">טלפון</div>
                <div className="col-span-1">סטטוס</div>
                <div className="col-span-1">תאריך</div>
                <div className="col-span-1">מחיר</div>
                <div className="col-span-2">הערות</div>
              </div>
            ) : (
              // Admin/Coordinator view - all columns
              <div className="grid grid-cols-12 gap-2 items-center text-sm font-semibold text-slate-700">
                <div className="col-span-1">שם הליד</div>
                <div className="col-span-1">טלפון</div>
                <div className="col-span-1">מקור</div>
                <div className="col-span-1">רלוונטיות</div>
                <div className="col-span-1">סטטוס</div>
                <div className="col-span-1">סוכן</div>
                <div className="col-span-1">תאריך</div>
                <div className="col-span-1">מחיר</div>
                <div className="col-span-3">הערות</div>
                <div className="col-span-1 text-right">מחיקה</div>
              </div>
            )}
          </div>
        </div>

        {/* Leads Display - Mobile Cards / Desktop Table */}
        <div className="bg-white rounded-xl md:rounded-none md:border-x md:border-b border-slate-100 md:shadow-sm overflow-hidden animate-fade-in-up animation-delay-500">
          {/* Mobile Card Layout */}
          <div className="block md:hidden">
            {/* Pull to Refresh Indicator */}
            {(pullDistance > 0 || isRefreshing) && (
              <div className="flex justify-center py-4 bg-blue-50">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className={`w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}></div>
                  <span className="text-sm font-medium">
                    {isRefreshing ? 'מרענן...' : 'שחרר לרענון'}
                  </span>
                </div>
              </div>
            )}

            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg className="w-12 h-12 text-slate-300 mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-600 font-medium">אין לידים להצגה</p>
                <p className="text-slate-500 text-sm mt-1">נסה לשנות את המסננים או להוסיף לידים חדשים</p>
              </div>
            ) : (
              <div
                className="divide-y divide-slate-100"
                onTouchStart={(e) => {
                  if (e.currentTarget.scrollTop === 0) {
                    const touch = e.touches[0];
                    setSwipeStart({ x: touch.clientX, y: touch.clientY });
                  }
                }}
                onTouchMove={(e) => {
                  if (!swipeStart || isRefreshing) return;
                  const touch = e.touches[0];
                  const diffY = touch.clientY - swipeStart.y;

                  if (diffY > 0 && e.currentTarget.scrollTop === 0) {
                    e.preventDefault();
                    const distance = Math.min(diffY / 2, 60);
                    setPullDistance(distance);
                  }
                }}
                onTouchEnd={(e) => {
                  if (pullDistance > 50 && !isRefreshing) {
                    handleRefresh();
                  } else {
                    setPullDistance(0);
                  }
                  setSwipeStart(null);
                }}
              >
                {filteredLeads.map((lead, index) => {
                  const status = getStatusInfo(lead.status, lead.relevance_status, statuses);
                  const source = getSourceInfo(lead.source, sources);
                  const agent = getAgentInfo(lead.assigned_agent_id, dbAgents);

                  return (
                    <div key={lead.id} className="relative">
                      {/* Swipe Action Background */}
                      <div className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg">
                        <div className="text-white text-sm font-medium">פעולות מהירות</div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${lead.phone.replace(/[^0-9]/g, '')}`);
                              setSwipedCard(null);
                            }}
                            className={`w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors`}
                            title="התקשר"
                          >
                            📞
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateLeadField(lead.id, 'status', lead.status === 'תואם' ? 'עסקה נסגרה' : 'תואם');
                              setSwipedCard(null);
                            }}
                            className={`w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors`}
                            title={lead.status === 'תואם' ? 'סגור עסקה' : 'סמן כתואם'}
                          >
                            {lead.status === 'תואם' ? '✅' : '📝'}
                          </button>
                        </div>
                      </div>

                      {/* Main Card */}
                      <div
                        className={`relative p-4 hover:bg-slate-50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        } ${
                          swipedCard === lead.id ? 'transform translate-x-4' : ''
                        }`}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          setSwipeStart({ x: touch.clientX, y: touch.clientY });
                        }}
                        onTouchMove={(e) => {
                          if (!swipeStart) return;
                          const touch = e.touches[0];
                          const diffX = touch.clientX - swipeStart.x;
                          const diffY = touch.clientY - swipeStart.y;

                          if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
                            e.preventDefault();
                            if (diffX > 0) {
                              setSwipedCard(lead.id);
                            }
                          }
                        }}
                        onTouchEnd={(e) => {
                          setSwipeStart(null);
                          if (swipedCard === lead.id) {
                            setTimeout(() => setSwipedCard(null), 3000);
                          }
                        }}
                      >
                        {/* Header with Name and Actions */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
                              {lead.lead_name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{lead.lead_name}</h3>
                              <p className="text-xs text-slate-500">
                                נוצר {new Date(lead.created_at).toLocaleDateString('he-IL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex gap-2 shrink-0">
                            <a
                              href={`tel:${formatPhoneNumber(lead.phone).replace(/[^0-9]/g, '')}`}
                              className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm transition-colors"
                              title="התקשר"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </a>
                            {/* Delete button - repositioned to right side of phone button */}
                            {user?.role === 'admin' && expandedMobileCards.has(lead.id) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('האם אתה בטוח שברצונך למחוק את הליד הזה?')) {
                                    deleteLead(lead.id).then(() => fetchData());
                                  }
                                }}
                                className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-sm transition-colors"
                                title="מחק ליד"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                            {/* Expand/Collapse Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMobileCard(lead.id);
                              }}
                              className="w-8 h-8 bg-slate-500 hover:bg-slate-600 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-200"
                              title={expandedMobileCards.has(lead.id) ? "הסתר פרטים" : "הצג פרטים"}
                            >
                              <svg
                                className={`w-4 h-4 transition-transform duration-200 ${expandedMobileCards.has(lead.id) ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Relevancy, Status, and Agent - Show as badges when collapsed, editable when expanded */}
                        {!expandedMobileCards.has(lead.id) && (
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {/* Relevancy Badge - Left */}
                            <div className="flex justify-center">
                              {
                                (() => {
                                  const currentRelevance = relevanceStatuses.find(status => status.id === lead.relevance_status);
                                  return currentRelevance ? (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentRelevance.lightBg} ${currentRelevance.text}`}>
                                      {currentRelevance.label}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">לא נבחר</span>
                                  );
                                })()
                              }
                            </div>

                            {/* Status Badge - Center */}
                            <div className="flex justify-center">
                              {status ? (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.lightBg} ${status.text}`}>
                                  {status.label}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">אין סטטוס</span>
                              )}
                            </div>

                            {/* Agent Badge - Right */}
                            <div className="flex justify-center">
                              {agent ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                  {agent.name}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">לא משויך</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Expandable Details Section - Only in mobile */}
                        {expandedMobileCards.has(lead.id) && (
                          <div className="space-y-3">
                            {/* Source and Phone */}
                            <div className="grid grid-cols-12 gap-4">
                              {/* Source */}
                              <div className="col-span-6">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-400">מקור:</span>
                                  {source ? (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${source.lightBg} ${source.text}`}>
                                      {source.label}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">לא ידוע</span>
                                  )}
                                </div>
                              </div>

                              {/* Phone */}
                              <div className="col-span-6">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-400">טלפון:</span>
                                  <span className="text-xs text-slate-600" dir="ltr">{formatPhoneNumber(lead.phone)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Controls Row 1: Status, Relevancy, Agent */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {/* Status Selector */}
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">סטטוס</label>
                                <ModernSelector
                                  value={lead.status || ''}
                                  onChange={(value) => handleUpdateLeadField(lead.id, 'status', value)}
                                  options={statuses.map(s => ({
                                    id: s.id,
                                    label: s.label,
                                    lightBg: s.lightBg,
                                    text: s.text
                                  }))}
                                  placeholder="בחר"
                                  compact
                                />
                              </div>

                              {/* Relevancy Selector - Only for coordinators/admin */}
                              {(user?.role === 'coordinator' || user?.role === 'admin') ? (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">רלוונטיות</label>
                                  <ModernSelector
                                    value={lead.relevance_status}
                                    onChange={(value) => handleUpdateLeadField(lead.id, 'relevance_status', value)}
                                    options={relevanceStatuses.map(r => ({
                                      id: r.id,
                                      label: r.label,
                                      lightBg: r.lightBg,
                                      text: r.text,
                                      icon: r.icon
                                    }))}
                                    placeholder="בחר"
                                    compact
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">רלוונטיות</label>
                                  <div className="py-1">
                                    {
                                      (() => {
                                        const currentRelevance = relevanceStatuses.find(status => status.id === lead.relevance_status);
                                        return currentRelevance ? (
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentRelevance.lightBg} ${currentRelevance.text}`}>
                                            {currentRelevance.label}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-400">לא נבחר</span>
                                        );
                                      })()
                                    }
                                  </div>
                                </div>
                              )}

                              {/* Agent Selector - Only for coordinators/admin */}
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">סוכן</label>
                                {(user?.role === 'coordinator' || user?.role === 'admin') ? (
                                  <ModernSelector
                                    value={lead.assigned_agent_id || ''}
                                    onChange={(value) => handleUpdateLeadField(lead.id, 'assigned_agent_id', value || null)}
                                    options={[
                                      { id: '', label: 'לא משויך' },
                                      ...dbAgents.map(a => ({
                                        id: a.id,
                                        label: a.name
                                      }))
                                    ]}
                                    placeholder="בחר"
                                    compact
                                  />
                                ) : (
                                  <div className="py-1">
                                    <span className="text-xs text-slate-600">
                                      {agent ? agent.name : 'לא משויך'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Controls Row 2: Date and Price */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {/* Meeting Date */}
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">תאריך פגישה</label>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDateTimeModal({
                                      leadId: lead.id,
                                      show: true,
                                      currentValue: lead.meeting_date ? new Date(lead.meeting_date).toISOString().slice(0, 16) : ''
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg transition-all duration-200 hover:shadow-sm flex items-center justify-between group"
                                  title="קביעת תאריך פגישה"
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-blue-700 group-hover:text-blue-800">
                                      {lead.meeting_date
                                        ? `${new Date(lead.meeting_date).toLocaleDateString('he-IL', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit'
                                          })} ${new Date(lead.meeting_date).toLocaleTimeString('he-IL', {
                                            hour: '2-digit', minute: '2-digit'
                                          })}`
                                        : 'בחר'
                                      }
                                    </span>
                                  </div>
                                  <svg className="w-3 h-3 text-blue-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>

                              {/* Price Field */}
                              <div>
                                <label className="text-xs text-slate-500 mb-1 block">מחיר</label>
                                {editingField?.leadId === lead.id && editingField?.field === 'price' ? (
                                  <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit();
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    className="w-full px-2 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm text-center bg-white"
                                    placeholder="0"
                                    autoFocus
                                  />
                                ) : (
                                  <button
                                    onClick={() => startEditing(lead.id, 'price', String(lead.price || '0'))}
                                    className="group w-full px-2 py-1.5 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg transition-all duration-200 flex items-center justify-center gap-1"
                                    title="לחץ לעריכת מחיר"
                                  >
                                    <span className="text-sm text-slate-700 font-medium">
                                      ₪{lead.price || '0'}
                                    </span>
                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Notes Field - Full Width */}
                            <div className="mb-3">
                              <label className="text-xs text-slate-500 mb-1 block">הערות</label>
                              <div>
                                {editingField?.leadId === lead.id && editingField?.field === 'agent_notes' ? (
                                  <div className="relative">
                                    <textarea
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          saveEdit();
                                        }
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full pl-8 pr-3 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-sm placeholder-purple-400 resize-none transition-all duration-200"
                                      placeholder="הוסף הערות, פרטים חשובים, העדפות לקוח..."
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="absolute right-2.5 top-2.5">
                                      <span className="text-purple-500 text-sm">📝</span>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startEditing(lead.id, 'agent_notes', lead.agent_notes || '')}
                                    className="w-full px-3 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 rounded-lg transition-all duration-200 hover:shadow-sm flex items-center justify-between group text-left"
                                    title="לחץ לעריכת הערות"
                                  >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <span className="text-sm text-purple-700 group-hover:text-purple-800 flex-1 overflow-auto">
                                        {lead.agent_notes || 'הוסף הערות...'}
                                      </span>
                                    </div>
                                    <svg className="w-3 h-3 text-purple-500 group-hover:text-purple-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
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

          {/* Desktop Table Layout */}
          <div className="hidden md:block">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg className="w-12 h-12 text-slate-300 mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-600 font-medium">אין לידים להצגה</p>
                <p className="text-slate-500 text-sm mt-1">נסה לשנות את המסננים או להוסיף לידים חדשים</p>
              </div>
            ) : (
              <div className="">
                {/* Table Body - Continuous Table Rows */}
                {filteredLeads.map((lead, index) => {
                    const status = getStatusInfo(lead.status, lead.relevance_status, statuses);
                    const source = getSourceInfo(lead.source, sources);
                    const agent = getAgentInfo(lead.assigned_agent_id, dbAgents);

                    return (
                      <div key={lead.id} className={`hover:bg-white/80 transition-all duration-200 border-b border-slate-100/50 last:border-b-0 px-4 py-3 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-100/60'
                      }`}>
                        {/* Main Row */}
                        {user?.role === 'agent' ? (
                          // Agent view - simplified columns (8 columns)
                          <div className="grid grid-cols-8 gap-2 items-center">
                            {/* Lead Name */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
                                  {lead.lead_name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {editingField?.leadId === lead.id && editingField?.field === 'lead_name' ? (
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            saveEdit();
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            cancelEdit();
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-sm bg-blue-50 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        autoFocus
                                        onBlur={saveEdit}
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={saveEdit}
                                          className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <h3
                                        className="font-medium text-slate-900 cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-all duration-200 break-words"
                                        onClick={() => startEditing(lead.id, 'lead_name', lead.lead_name)}
                                        title="לחץ לעריכה"
                                      >
                                        {lead.lead_name}
                                      </h3>
                                      <p className="text-xs text-slate-500">
                                        נוצר {new Date(lead.created_at).toLocaleDateString('he-IL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit'
                                })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Phone */}
                            <div className="col-span-1">
                              {editingField?.leadId === lead.id && editingField?.field === 'phone' ? (
                                <div className="space-y-1">
                                  <input
                                    type="tel"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveEdit();
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelEdit();
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-sm font-mono bg-blue-50 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                    onBlur={saveEdit}
                                    placeholder="050-123-4567"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <div
                                    className="font-mono text-slate-700 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-all duration-200"
                                    onClick={() => startEditing(lead.id, 'phone', lead.phone)}
                                    title="לחץ לעריכה"
                                  >
                                    {formatPhoneNumber(lead.phone)}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Status */}
                            <div className="col-span-1">
                              <ModernSelector
                                value={lead.status || ''}
                                onChange={(value) => handleUpdateLeadField(lead.id, 'status', value)}
                                options={statuses.map(s => ({
                                  id: s.id,
                                  label: s.label,
                                  lightBg: s.lightBg,
                                  text: s.text
                                }))}
                                placeholder="בחר סטטוס"
                                compact
                              />
                            </div>

                            {/* Meeting Date */}
                            <div className="col-span-1">
                              <InlineDateTimePicker
                                value={lead.meeting_date}
                                onChange={(value) => handleUpdateLeadField(lead.id, 'meeting_date', value)}
                              />
                            </div>

                            {/* Price Field */}
                            <div className="col-span-1 flex items-center justify-center">
                              {editingField?.leadId === lead.id && editingField?.field === 'price' ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="w-20 px-2 py-1 bg-white border border-blue-400 rounded text-xs text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                  placeholder="0"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => startEditing(lead.id, 'price', String(lead.price || '0'))}
                                  className="group flex items-center gap-1 px-2 py-1 text-slate-600 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-transparent rounded transition-all duration-200"
                                  title="לחץ לעריכת מחיר"
                                >
                                  <span className="font-medium">₪{lead.price || '0'}</span>
                                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Notes Field */}
                            <div className="col-span-2">
                              {editingField?.leadId === lead.id && editingField?.field === 'agent_notes' ? (
                                <textarea
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="w-full px-2 py-1 bg-purple-50 border border-purple-200 rounded text-xs resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100"
                                  placeholder="הערות"
                                  rows={2}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => startEditing(lead.id, 'agent_notes', lead.agent_notes || '')}
                                  className="w-full px-2 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded text-xs transition-all duration-200 text-purple-700 text-right min-h-[50px] flex items-start justify-start"
                                  title="לחץ לעריכת הערות"
                                >
                                  <div className="text-xs leading-tight overflow-auto max-h-[50px]">
                                    {lead.agent_notes || 'הערות'}
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Admin/Coordinator view - all columns (12 columns)
                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Lead Name */}
                            <div className="col-span-1">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-slate-600 font-medium text-sm">
                                  {lead.lead_name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {editingField?.leadId === lead.id && editingField?.field === 'lead_name' ? (
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            saveEdit();
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            cancelEdit();
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-sm bg-blue-50 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        autoFocus
                                        onBlur={saveEdit}
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={saveEdit}
                                          className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <h3
                                        className="font-medium text-slate-900 cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-all duration-200 break-words"
                                        onClick={() => startEditing(lead.id, 'lead_name', lead.lead_name)}
                                        title="לחץ לעריכה"
                                      >
                                        {lead.lead_name}
                                      </h3>
                                      <p className="text-xs text-slate-500">
                                        נוצר {new Date(lead.created_at).toLocaleDateString('he-IL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit'
                                })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Phone */}
                            <div className="col-span-1">
                              {editingField?.leadId === lead.id && editingField?.field === 'phone' ? (
                                <div className="space-y-1">
                                  <input
                                    type="tel"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveEdit();
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        cancelEdit();
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-sm font-mono bg-blue-50 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                    onBlur={saveEdit}
                                    placeholder="050-123-4567"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <div
                                    className="font-mono text-slate-700 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-1 py-0.5 rounded transition-all duration-200"
                                    onClick={() => startEditing(lead.id, 'phone', lead.phone)}
                                    title="לחץ לעריכה"
                                  >
                                    {formatPhoneNumber(lead.phone)}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Source */}
                            <div className="col-span-1">
                              <ModernSelector
                                value={lead.source}
                                onChange={(value) => handleUpdateLeadField(lead.id, 'source', value)}
                                options={sources.map(s => ({
                                  id: s.id,
                                  label: s.label,
                                  lightBg: s.lightBg,
                                  text: s.text,
                                  icon: s.icon
                                }))}
                                placeholder="בחר מקור"
                                compact
                              />
                            </div>

                            {/* Relevance Status */}
                            <div className="col-span-1">
                              {(user?.role === 'coordinator' || user?.role === 'admin') ? (
                                <ModernSelector
                                  value={lead.relevance_status}
                                  onChange={(value) => handleUpdateLeadField(lead.id, 'relevance_status', value)}
                                  options={relevanceStatuses.map(r => ({
                                    id: r.id,
                                    label: r.label,
                                    lightBg: r.lightBg,
                                    text: r.text,
                                    icon: r.icon
                                  }))}
                                  placeholder="בחר רלוונטיות"
                                  compact
                                />
                              ) : (
                                <div>
                                  {relevanceStatuses.find(r => r.id === lead.relevance_status) && (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${relevanceStatuses.find(r => r.id === lead.relevance_status)?.lightBg} ${relevanceStatuses.find(r => r.id === lead.relevance_status)?.text}`}>
                                      {relevanceStatuses.find(r => r.id === lead.relevance_status)?.label}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Status */}
                            <div className="col-span-1">
                              <ModernSelector
                                value={lead.status || ''}
                                onChange={(value) => handleUpdateLeadField(lead.id, 'status', value)}
                                options={statuses.map(s => ({
                                  id: s.id,
                                  label: s.label,
                                  lightBg: s.lightBg,
                                  text: s.text
                                }))}
                                placeholder="בחר סטטוס"
                                compact
                              />
                            </div>

                            {/* Agent */}
                            <div className="col-span-1">
                              {(user?.role === 'admin' || user?.role === 'coordinator') ? (
                                <ModernSelector
                                  value={lead.assigned_agent_id || ''}
                                  onChange={(value) => handleUpdateLeadField(lead.id, 'assigned_agent_id', value)}
                                  options={[
                                    { id: '', label: 'ללא סוכן', lightBg: 'bg-slate-100', text: 'text-slate-600' },
                                    ...dbAgents.filter(a => a.role === 'agent').map(a => ({
                                      id: a.id,
                                      label: a.name,
                                      lightBg: 'bg-blue-50',
                                      text: 'text-blue-700'
                                    }))
                                  ]}
                                  placeholder="בחר סוכן"
                                  compact
                                />
                              ) : (
                                <div>
                                  {agent ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      {agent.name}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                      ללא סוכן
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Meeting Date */}
                            <div className="col-span-1">
                              <InlineDateTimePicker
                                value={lead.meeting_date}
                                onChange={(value) => handleUpdateLeadField(lead.id, 'meeting_date', value)}
                              />
                            </div>

                            {/* Price Field */}
                            <div className="col-span-1 flex items-center justify-center">
                              {editingField?.leadId === lead.id && editingField?.field === 'price' ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="w-20 px-2 py-1 bg-white border border-blue-400 rounded text-xs text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                  placeholder="0"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => startEditing(lead.id, 'price', String(lead.price || '0'))}
                                  className="group flex items-center gap-1 px-2 py-1 text-slate-600 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-transparent rounded transition-all duration-200"
                                  title="לחץ לעריכת מחיר"
                                >
                                  <span className="font-medium">₪{lead.price || '0'}</span>
                                  <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Notes Field */}
                            <div className="col-span-3">
                              {editingField?.leadId === lead.id && editingField?.field === 'agent_notes' ? (
                                <textarea
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="w-full px-2 py-1 bg-purple-50 border border-purple-200 rounded text-xs resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100"
                                  placeholder="הערות"
                                  rows={2}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => startEditing(lead.id, 'agent_notes', lead.agent_notes || '')}
                                  className="w-full px-2 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded text-xs transition-all duration-200 text-purple-700 text-right min-h-[50px] flex items-start justify-start"
                                  title="לחץ לעריכת הערות"
                                >
                                  <div className="text-xs leading-tight overflow-auto max-h-[50px]">
                                    {lead.agent_notes || 'הערות'}
                                  </div>
                                </button>
                              )}
                            </div>

                            {/* Delete Button */}
                            <div className="col-span-1 flex items-center justify-end pr-0">
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => {
                                    if (confirm('האם אתה בטוח שברצונך למחוק את הליד הזה? פעולה זו לא ניתנת לביטול.')) {
                                      handleDeleteLead(lead.id);
                                    }
                                  }}
                                  className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-lg transition-colors flex items-center justify-center group hover:shadow-sm"
                                  title="מחק ליד"
                                >
                                  <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}


                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Time Modal */}
      {dateTimeModal?.show && (
        <DatePicker
          value={dateTimeModal.currentValue}
          onChange={(value) => {
            if (value) {
              handleUpdateLeadField(dateTimeModal.leadId, 'meeting_date', new Date(value).toISOString());
            } else {
              handleUpdateLeadField(dateTimeModal.leadId, 'meeting_date', null);
            }
          }}
          onSave={() => {
            setDateTimeModal(null);
          }}
          onCancel={() => {
            setDateTimeModal(null);
          }}
          autoFocus={true}
          placeholder="בחר תאריך ושעה לפגישה"
        />
      )}
    </div>
  );
}