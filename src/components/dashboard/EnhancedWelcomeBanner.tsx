'use client'

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Clock
} from 'lucide-react';
import CompactKPICard from './CompactKPICard';
import TimeRangeFilter, { DEFAULT_TIME_RANGES } from './TimeRangeFilter';
import {
  AnalyticsData,
  calculateMonthOverMonth,
  MonthOverMonthData
} from './analyticsUtils';
import { Lead, Agent } from '@/lib/database.types';

// ============================================================================
// ENHANCED WELCOME BANNER - 2025 Design
// ============================================================================

export interface EnhancedWelcomeBannerProps {
  analyticsData: AnalyticsData;
  allLeads: Lead[]; // Need all leads for month-over-month comparison
  timeRange: string;
  setTimeRange: (range: string) => void;
  currentUser?: Agent | null;
  className?: string;
}

/**
 * EnhancedWelcomeBanner Component
 *
 * Modern glassmorphic welcome section with business-critical KPIs
 * Features:
 * - Month-over-month comparisons
 * - Revenue focus
 * - Conversion metrics
 * - Animated counters
 * - Glassmorphism design
 */
export default function EnhancedWelcomeBanner({
  analyticsData,
  allLeads,
  timeRange,
  setTimeRange,
  currentUser,
  className = ''
}: EnhancedWelcomeBannerProps) {
  // Calculate month-over-month data
  const monthData = calculateMonthOverMonth(allLeads);

  // Extract key metrics
  const { closedLeads, pendingAssignment, analyticsLeads } = analyticsData;

  // Calculate conversion rate for current period
  const conversionRate =
    analyticsLeads.length > 0
      ? (closedLeads / analyticsLeads.length) * 100
      : 0;

  return (
    <div className={`${className}`}>
      {/* Compact banner with integrated cards - matching original style */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Decorative Background Circles - matching original */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Welcome Text with Time Filter */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">היי {currentUser?.name || 'משתמש'}! 👋</h2>
              <p className="text-blue-100 text-lg">הנה התמונה העסקית שלך</p>
            </div>

            {/* Integrated Time Filter - Direct glass morphism */}
            <TimeRangeFilter
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              timeRanges={DEFAULT_TIME_RANGES}
              className="text-white"
              glassMorphism={true}
            />
          </div>
        </div>

        {/* Compact KPI Cards Grid - integrated into banner */}
        <div className={`relative z-10 grid grid-cols-2 ${currentUser?.role === 'coordinator' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-3 md:gap-4`}>
          {/* Revenue for selected time period - Hide for coordinators */}
          {currentUser?.role !== 'coordinator' && (
            <div className="animate-fade-in-scale animation-delay-200">
              <CompactKPICard
                title="הכנסות"
                value={analyticsData.totalRevenue}
                format="currency"
                change={monthData.changes.revenueChangePercent}
                subtitle={`${closedLeads} עסקאות`}
                animate={true}
              />
            </div>
          )}

          {/* Closed Deals */}
          <div className="animate-fade-in-scale animation-delay-300">
            <CompactKPICard
              title="עסקאות שנסגרו"
              value={monthData.currentMonth.closedDeals}
              format="number"
              change={monthData.changes.dealsChangePercent}
              subtitle={
                currentUser?.role === 'coordinator'
                  ? monthData.currentMonth.closedDeals > 0
                    ? 'החודש'
                    : 'אין עסקאות'
                  : monthData.currentMonth.closedDeals > 0
                  ? `ממוצע: ${(
                      monthData.currentMonth.revenue /
                      monthData.currentMonth.closedDeals
                    ).toLocaleString('he-IL', {
                      style: 'currency',
                      currency: 'ILS',
                      minimumFractionDigits: 0
                    })}`
                  : 'אין עסקאות'
              }
              animate={true}
            />
          </div>

          {/* Pending Action */}
          <div className="animate-fade-in-scale animation-delay-400">
            <CompactKPICard
              title="ממתינים לטיפול"
              value={pendingAssignment}
              format="number"
              subtitle={`${
                analyticsLeads.length > 0
                  ? ((pendingAssignment / analyticsLeads.length) * 100).toFixed(0)
                  : 0
              }% מכלל הלידים`}
              animate={true}
            />
          </div>

          {/* Conversion Rate */}
          <div className="animate-fade-in-scale animation-delay-500">
            <CompactKPICard
              title="אחוז המרה"
              value={conversionRate}
              format="percentage"
              change={monthData.changes.conversionChange}
              subtitle={`${closedLeads} מתוך ${analyticsLeads.length}`}
              animate={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}