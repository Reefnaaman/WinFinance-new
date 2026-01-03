'use client'

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// MODERN KPI CARD COMPONENT - 2025 Design System
// ============================================================================

export interface ModernKPICardProps {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage';
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
  className?: string;
  animate?: boolean;
}

/**
 * ModernKPICard Component
 *
 * A glassmorphic KPI card with smooth animations and trend indicators
 * Features:
 * - Glassmorphism design with backdrop blur
 * - Animated number counting
 * - Trend indicators with colors
 * - Responsive design
 * - RTL support for Hebrew
 */
export default function ModernKPICard({
  title,
  value,
  change,
  changeLabel,
  subtitle,
  icon,
  format = 'number',
  color = 'blue',
  className = '',
  animate = true
}: ModernKPICardProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const [isAnimating, setIsAnimating] = useState(false);

  // Color mappings for gradients
  const colorClasses = {
    blue: 'from-blue-500/20 to-indigo-500/20 border-blue-200/20',
    green: 'from-emerald-500/20 to-green-500/20 border-emerald-200/20',
    purple: 'from-purple-500/20 to-violet-500/20 border-purple-200/20',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-200/20',
    rose: 'from-rose-500/20 to-pink-500/20 border-rose-200/20'
  };

  // Animate number counting effect
  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    setIsAnimating(true);
    const duration = 1000; // 1 second animation
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = value / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep === steps) {
        setDisplayValue(value);
        setIsAnimating(false);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(increment * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  // Format the display value
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return val.toLocaleString('he-IL', {
          style: 'currency',
          currency: 'ILS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('he-IL');
    }
  };

  // Determine trend icon and color
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-rose-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-emerald-500' : 'text-rose-500';
  };

  return (
    <div
      className={`
        relative overflow-hidden
        bg-white/60 dark:bg-gray-900/60
        backdrop-blur-xl
        border border-white/20
        rounded-2xl
        p-6
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl
        hover:bg-white/70 dark:hover:bg-gray-900/70
        group
        ${className}
      `}
    >
      {/* Background gradient overlay */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br ${colorClasses[color]}
          opacity-50 group-hover:opacity-70
          transition-opacity duration-300
        `}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                {icon}
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {title}
            </h3>
          </div>
        </div>

        {/* Main value */}
        <div className="mb-2">
          <p
            className={`
              text-3xl font-bold text-gray-900 dark:text-white
              ${isAnimating ? 'tabular-nums' : ''}
            `}
          >
            {formatValue(displayValue)}
          </p>
        </div>

        {/* Change indicator */}
        {change !== undefined && (
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {change > 0 && '+'}
              {change.toFixed(1)}%
            </span>
            {changeLabel && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {changeLabel}
              </span>
            )}
          </div>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* Animated shimmer effect on hover */}
      <div
        className="
          absolute inset-0 -translate-x-full
          bg-gradient-to-r from-transparent via-white/20 to-transparent
          group-hover:translate-x-full
          transition-transform duration-1000 ease-out
          pointer-events-none
        "
      />
    </div>
  );
}