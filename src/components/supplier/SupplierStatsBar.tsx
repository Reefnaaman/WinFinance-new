'use client'

import React from 'react';
import { TrendingUp, Users, Coins, Target, XCircle, Calendar } from 'lucide-react';

interface SupplierStatsBarProps {
  stats: {
    totalLeads: number;
    closedDeals: number;
    failedDeals: number;
    scheduledMeetings: number;
    totalRevenue: number;
    successRate: number;
    statusBreakdown: Record<string, number>;
  };
}

export default function SupplierStatsBar({ stats }: SupplierStatsBarProps) {
  const statCards = [
    {
      title: 'סה"כ לידים',
      value: stats.totalLeads.toString(),
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'ממתינים לפגישה',
      value: stats.scheduledMeetings.toString(),
      icon: Calendar,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'עסקאות נסגרו',
      value: stats.closedDeals.toString(),
      icon: Target,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      title: 'לא רצו',
      value: stats.failedDeals.toString(),
      icon: XCircle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: 'הכנסות',
      value: `₪${stats.totalRevenue.toLocaleString('he-IL')}`,
      icon: Coins,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      title: 'אחוז הצלחה',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    }
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
      {statCards.map((card, index) => (
        <div
          key={card.title}
          className="relative bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl p-2 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up md:aspect-auto"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Subtle gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5 rounded-xl`} />

          <div className="relative z-10 md:block">
            <div className="flex justify-center md:justify-start mb-1 md:mb-3">
              <div className={`p-1.5 md:p-2 ${card.bgColor} rounded-lg`}>
                <card.icon className={`w-4 h-4 md:w-5 md:h-5 ${card.textColor}`} />
              </div>
            </div>

            <div className="text-center md:text-left">
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {card.value}
              </p>
              <p className="text-xs md:text-sm text-gray-600 md:text-gray-500 font-medium md:font-normal">
                {card.title}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}