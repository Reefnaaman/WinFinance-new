'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Agent } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import LeadsPage from './leads/LeadsPage';
import SettingsPage from './settings/SettingsPage';
import HomePage from './dashboard/HomePage';
import SupplierDashboard from './supplier/SupplierDashboard';
import { getDateRange } from './shared/leadUtils';
import { calculateAnalytics } from './dashboard/analyticsUtils';
import Image from 'next/image';

export default function FullDashboard() {
  const { user, loading: authLoading, logout, canCreateLeads, canViewAllLeads } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [activeAgent, setActiveAgent] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [activeSource, setActiveSource] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('month');

  // Database data
  const [dbLeads, setDbLeads] = useState<Lead[]>([]);
  const [dbAgents, setDbAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Mobile navigation state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Mobile swipe and interaction state
  const [swipedCard, setSwipedCard] = useState<string | null>(null);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);

  // Pull to refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState<'status' | 'date' | 'name' | 'agent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      // Add small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: agentsData } = await supabase
        .from('agents')
        .select('*')
        .order('name');

      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      setDbAgents(agentsData || []);
      setDbLeads(leadsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect MUST be before any conditional returns
  useEffect(() => {
    fetchData();
  }, []);

  // Force agents and lead suppliers to their respective pages
  // Also set default sorting for agents
  useEffect(() => {
    if (user?.role === 'agent') {
      setCurrentPage('leads');
      // Automatically sort by date for agents (most recent first)
      setSortBy('date');
      setSortOrder('desc');
    } else if (user?.role === 'lead_supplier') {
      setCurrentPage('supplier-dashboard');
    }
  }, [user]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <Login />;
  }

  // Dynamic sources - includes lead providers
  const leadProviders = dbAgents.filter(agent => agent.role === 'lead_supplier');
  const sources = [
    { id: 'Email', label: 'Email', icon: 'Mail', color: 'bg-blue-500', lightBg: 'bg-blue-50', text: 'text-blue-700' },
    ...leadProviders.map((provider, index) => ({
      id: provider.name,
      label: provider.name,
      icon: 'Users',
      color: ['bg-emerald-500', 'bg-teal-500', 'bg-green-500', 'bg-cyan-500'][index % 4],
      lightBg: ['bg-emerald-50', 'bg-teal-50', 'bg-green-50', 'bg-cyan-50'][index % 4],
      text: ['text-emerald-700', 'text-teal-700', 'text-green-700', 'text-cyan-700'][index % 4]
    })),
    { id: 'Manual', label: 'ידני', icon: 'Edit', color: 'bg-purple-500', lightBg: 'bg-purple-50', text: 'text-purple-700' },
    { id: 'Other', label: 'אחר', icon: 'MoreHorizontal', color: 'bg-slate-500', lightBg: 'bg-slate-50', text: 'text-slate-700' },
  ];

  // Status definitions - all 7 statuses from database
  const agentStatuses = [
    { id: 'ליד חדש', label: 'ליד חדש', color: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700' },
    { id: 'תואם', label: 'תואם', color: 'bg-purple-500', lightBg: 'bg-purple-50', text: 'text-purple-700' },
    { id: 'אין מענה - לתאם מחדש', label: 'אין מענה - לתאם מחדש', color: 'bg-yellow-500', lightBg: 'bg-yellow-50', text: 'text-yellow-700' },
    { id: 'התקיימה - כשלון', label: 'התקיימה - כשלון', color: 'bg-red-500', lightBg: 'bg-red-50', text: 'text-red-700' },
    { id: 'במעקב', label: 'במעקב', color: 'bg-blue-500', lightBg: 'bg-blue-50', text: 'text-blue-700' },
    { id: 'עסקה נסגרה', label: 'עסקה נסגרה', color: 'bg-green-500', lightBg: 'bg-green-50', text: 'text-green-700' },
    { id: 'לא רלוונטי', label: 'לא רלוונטי', color: 'bg-gray-500', lightBg: 'bg-gray-50', text: 'text-gray-700' },
  ];

  const relevanceStatuses = [
    { id: 'ממתין לבדיקה', label: 'ממתין לבדיקה', color: 'bg-yellow-500', lightBg: 'bg-yellow-100', text: 'text-yellow-800' },
    { id: 'רלוונטי', label: 'רלוונטי', color: 'bg-green-500', lightBg: 'bg-green-100', text: 'text-green-800' },
    { id: 'לא רלוונטי', label: 'לא רלוונטי', color: 'bg-red-500', lightBg: 'bg-red-100', text: 'text-red-800' },
    { id: 'במעקב', label: 'במעקב', color: 'bg-blue-500', lightBg: 'bg-blue-100', text: 'text-blue-800' },
  ];

  // Calculate analytics for dashboard pages
  const analyticsData = calculateAnalytics(dbLeads, dbAgents, timeRange, leadProviders);

  // Calculate filter counts for real-time badges
  const filterCounts = {
    agents: {} as Record<string, number>,
    statuses: {} as Record<string, number>,
    sources: {} as Record<string, number>
  };

  // Initialize counts
  filterCounts.agents['all'] = dbLeads.length;
  filterCounts.statuses['all'] = dbLeads.length;
  filterCounts.sources['all'] = dbLeads.length;

  // Count leads per agent (only for agents)
  const agentsList = dbAgents.filter(agent => agent.role === 'agent');
  agentsList.forEach(agent => {
    filterCounts.agents[agent.id] = dbLeads.filter(lead => lead.assigned_agent_id === agent.id).length;
  });

  // Count leads per status
  agentStatuses.forEach(status => {
    filterCounts.statuses[status.id] = dbLeads.filter(lead => lead.status === status.id).length;
  });

  // Count leads per source
  sources.forEach(source => {
    filterCounts.sources[source.id] = dbLeads.filter(lead => lead.source === source.id).length;
  });

  const filteredLeads = dbLeads.filter(lead => {
    // Role-based filtering: agents only see their assigned leads
    if (user?.role === 'agent') {
      const matches = lead.assigned_agent_id === user.id;
      if (!matches && lead.assigned_agent_id) {
        console.log('Agent filter mismatch:', {
          leadAgentId: lead.assigned_agent_id,
          userId: user.id,
          userName: user.name,
          leadName: lead.lead_name
        });
      }
      return matches;
    }

    // Lead suppliers only see leads they created
    if (user?.role === 'lead_supplier' && lead.source !== user.name) {
      return false;
    }

    // Time-based filtering based on lead creation date
    const filterDate = getDateRange(timeRange);
    if (filterDate) {
      const leadCreatedDate = new Date(lead.created_at);
      if (leadCreatedDate < filterDate) {
        return false;
      }
    }

    // Agent filtering
    const matchesAgent = activeAgent === 'all' || lead.assigned_agent_id === activeAgent;

    // Status filtering
    const matchesStatus = activeStatus === 'all' || lead.status === activeStatus;

    // Source filtering
    const matchesSource = activeSource === 'all' || lead.source === activeSource;

    // Search filtering
    const matchesSearch = searchTerm === '' ||
                          lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm);

    return matchesAgent && matchesStatus && matchesSource && matchesSearch;
  });

  // Sort filtered leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'status':
        // Define status priority (new leads first)
        const statusPriority: Record<string, number> = {
          'ליד חדש': 1,
          'אין מענה - לתאם מחדש': 2,
          'במעקב': 3,
          'עסקה נסגרה': 4,
          'התקיימה - כשלון': 5,
          'לא רלוונטי': 6
        };
        const aPriority = statusPriority[a.status || ''] || 999;
        const bPriority = statusPriority[b.status || ''] || 999;
        comparison = aPriority - bPriority;
        break;

      case 'date':
        // Use meeting_date if exists, otherwise use created_at
        // This ensures scheduled meetings appear based on their meeting date
        const aDate = a.meeting_date || a.scheduled_call_date || a.created_at;
        const bDate = b.meeting_date || b.scheduled_call_date || b.created_at;

        // Handle cases where dates might be null/undefined
        // Leads without meeting dates should appear after those with dates
        if (!a.meeting_date && !a.scheduled_call_date && (b.meeting_date || b.scheduled_call_date)) {
          // a has no scheduled date but b does, a should come after b
          comparison = 1;
        } else if ((a.meeting_date || a.scheduled_call_date) && !b.meeting_date && !b.scheduled_call_date) {
          // a has scheduled date but b doesn't, a should come before b
          comparison = -1;
        } else {
          // Both have dates or both don't have dates, compare normally
          const aTime = aDate ? new Date(aDate).getTime() : 0;
          const bTime = bDate ? new Date(bDate).getTime() : 0;
          comparison = aTime - bTime;
        }
        break;

      case 'name':
        comparison = a.lead_name.localeCompare(b.lead_name, 'he');
        break;

      case 'agent':
        const aAgent = dbAgents.find(agent => agent.id === a.assigned_agent_id)?.name || 'zzz';
        const bAgent = dbAgents.find(agent => agent.id === b.assigned_agent_id)?.name || 'zzz';
        comparison = aAgent.localeCompare(bAgent, 'he');
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Navigation items - exclude Settings for coordinators
  const navItems = user?.role === 'coordinator'
    ? [
        { id: 'home', label: 'בית', icon: '🏠' },
        { id: 'leads', label: 'לידים', icon: '👥' },
      ]
    : [
        { id: 'home', label: 'בית', icon: '🏠' },
        { id: 'leads', label: 'לידים', icon: '👥' },
        { id: 'settings', label: 'הגדרות', icon: '⚙️' },
      ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-none mx-auto px-2 sm:px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Hamburger Menu */}
            <div className="flex items-center gap-4">
              {/* Mobile Hamburger Menu - Only for admin/coordinator */}
              {user?.role !== 'agent' && user?.role !== 'lead_supplier' && (
                <button
                  onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="תפריט ראשי"
                >
                  <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                    <div className={`w-5 h-0.5 bg-slate-600 transition-all ${isMobileNavOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                    <div className={`w-5 h-0.5 bg-slate-600 transition-all ${isMobileNavOpen ? 'opacity-0' : ''}`}></div>
                    <div className={`w-5 h-0.5 bg-slate-600 transition-all ${isMobileNavOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                  </div>
                </button>
              )}

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="hidden md:block">
                  <h1 className="text-lg md:text-xl font-bold text-slate-800">WinFinance</h1>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 relative">
                  <Image
                    src="/winfinance-logo-no-text.png"
                    alt="WinFinance Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Desktop Navigation - Hidden for agents, lead suppliers, and on mobile */}
              {user?.role !== 'agent' && user?.role !== 'lead_supplier' && (
                <nav className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1 mr-6">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        currentPage === item.id
                          ? 'bg-white shadow-sm text-slate-800'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              )}
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-slate-700">{user.name}</p>
              <button
                onClick={logout}
                className="ml-2 px-3 py-1.5 text-sm text-slate-800 bg-red-500/30 hover:text-slate-900 hover:bg-red-500/40 rounded-lg transition-colors"
              >
                יציאה
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileNavOpen && user?.role !== 'agent' && user?.role !== 'lead_supplier' && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-lg fixed top-[73px] left-0 right-0 z-[9990]">
          <nav className="max-w-none mx-auto px-2 sm:px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileNavOpen(false);
                  }}
                  className={`p-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-none mx-auto px-2 sm:px-4 py-6 md:py-8">
        {currentPage === 'home' && (
          <HomePage
            dbLeads={dbLeads}
            dbAgents={dbAgents}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            currentUser={user}
          />
        )}
        {currentPage === 'leads' && (
          <LeadsPage
            filteredLeads={sortedLeads}
            dbAgents={dbAgents}
            sources={sources}
            statuses={agentStatuses}
            relevanceStatuses={relevanceStatuses}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeAgent={activeAgent}
            setActiveAgent={setActiveAgent}
            activeStatus={activeStatus}
            setActiveStatus={setActiveStatus}
            activeSource={activeSource}
            setActiveSource={setActiveSource}
            filterCounts={filterCounts}
            fetchData={fetchData}
            canCreateLeads={canCreateLeads}
            swipedCard={swipedCard}
            setSwipedCard={setSwipedCard}
            swipeStart={swipeStart}
            setSwipeStart={setSwipeStart}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            isRefreshing={isRefreshing}
            pullDistance={pullDistance}
            handleRefresh={handleRefresh}
            setPullDistance={setPullDistance}
          />
        )}
        {currentPage === 'settings' && (
          <SettingsPage
            dbAgents={dbAgents}
            fetchData={fetchData}
          />
        )}
        {currentPage === 'supplier-dashboard' && (
          <SupplierDashboard
            dbLeads={dbLeads}
            dbAgents={dbAgents}
            currentUser={user}
            fetchData={fetchData}
          />
        )}
      </main>
    </div>
  );
}