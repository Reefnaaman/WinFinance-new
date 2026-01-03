'use client'

import React, { useState, useMemo } from 'react';
import { Lead, Agent } from '@/lib/database.types';
import SupplierLeadsTable from './SupplierLeadsTable';
import SupplierLeadEntryForm from './SupplierLeadEntryForm';
import { Plus, X } from 'lucide-react';

interface SupplierDashboardProps {
  dbLeads: Lead[];
  dbAgents: Agent[];
  currentUser: Agent | null;
  fetchData: () => Promise<void>;
}

export default function SupplierDashboard({
  dbLeads,
  dbAgents,
  currentUser,
  fetchData
}: SupplierDashboardProps) {
  const [showAddLead, setShowAddLead] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter leads to only show supplier's leads
  const supplierLeads = useMemo(() => {
    return dbLeads.filter(lead => lead.source === currentUser?.name);
  }, [dbLeads, currentUser]);

  // Filter by search term
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return supplierLeads;

    const search = searchTerm.toLowerCase();
    return supplierLeads.filter(lead =>
      lead.lead_name.toLowerCase().includes(search) ||
      lead.phone.includes(search)
    );
  }, [supplierLeads, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalLeads = supplierLeads.length;
    const closedDeals = supplierLeads.filter(l => l.status === 'עסקה נסגרה').length;
    const failedDeals = supplierLeads.filter(l => l.status === 'התקיימה - כשלון').length;
    const scheduledMeetings = supplierLeads.filter(l => l.status === 'תואם').length;
    const totalRevenue = supplierLeads
      .filter(l => l.status === 'עסקה נסגרה' && l.price)
      .reduce((sum, lead) => sum + Number(lead.price), 0);
    const successRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;

    // Status breakdown for chart
    const statusBreakdown: Record<string, number> = {};
    supplierLeads.forEach(lead => {
      const status = lead.status || 'ליד חדש';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    return {
      totalLeads,
      closedDeals,
      failedDeals,
      scheduledMeetings,
      totalRevenue,
      successRate,
      statusBreakdown
    };
  }, [supplierLeads]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Blue Header with Greeting - matching agent design */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg animate-fade-in-up animation-delay-200">
        <div className="mb-4">
          <h3 className="text-lg md:text-2xl font-bold mb-1">היי {currentUser?.name}! 👋</h3>
          <p className="text-blue-100 text-sm">הנה הסיכום שלך - כל הלידים שסיפקת והעדכונים במקום אחד</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4">
            <p className="text-blue-100 text-xs md:text-sm">סה"כ לידים</p>
            <p className="text-xl md:text-3xl font-bold">{stats.totalLeads}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4">
            <p className="text-blue-100 text-xs md:text-sm">עסקאות נסגרו</p>
            <p className="text-xl md:text-3xl font-bold text-green-300">{stats.closedDeals}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4">
            <p className="text-blue-100 text-xs md:text-sm">שיעור הצלחה</p>
            <p className="text-xl md:text-3xl font-bold text-yellow-300">{stats.successRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4">
            <p className="text-blue-100 text-xs md:text-sm">סכום סגירת ביטוחים כולל</p>
            <p className="text-xl md:text-3xl font-bold text-cyan-300">₪{stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-3 md:gap-4 text-xs md:text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-300 rounded-full"></div>
            <span>תואם: {stats.scheduledMeetings}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-red-300 rounded-full"></div>
            <span>נכשל: {stats.failedDeals}</span>
          </div>
        </div>
      </div>

      {/* Search Bar with Action Button */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="חיפוש לפי שם או טלפון..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setShowAddLead(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>ליד חדש</span>
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <SupplierLeadsTable
        leads={filteredLeads}
        dbAgents={dbAgents}
      />

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">הוספת ליד חדש</h3>
              <button
                onClick={() => setShowAddLead(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <SupplierLeadEntryForm
              onClose={() => setShowAddLead(false)}
              onLeadAdded={() => {
                fetchData();
                setShowAddLead(false);
              }}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

    </div>
  );
}