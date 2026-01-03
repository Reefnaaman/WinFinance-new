'use client'

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ============================================================================
// COMPACT KPI CARD - Space-efficient design
// ============================================================================

export interface CompactKPICardProps {
  title: string;
  value: number | string;
  change?: number;
  subtitle?: string;
  format?: 'number' | 'currency' | 'percentage';
  animate?: boolean;
}

/**
 * CompactKPICard Component
 *
 * Space-efficient KPI card with clean design
 * Matches original color scheme
 */
export default function CompactKPICard({
  title,
  value,
  change,
  subtitle,
  format = 'number',
  animate = true
}: CompactKPICardProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  // Animate number counting effect
  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 800;
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = value / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep === steps) {
        setDisplayValue(value);
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

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 flex flex-col">
      {/* Title */}
      <p className="text-blue-100 text-xs mb-1">{title}</p>

      {/* Value with change indicator */}
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold text-white">
          {formatValue(displayValue)}
        </p>

        {change !== undefined && change !== 0 && (
          <div className="flex items-center gap-0.5">
            {change > 0 ? (
              <TrendingUp className="w-3 h-3 text-green-300" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-300" />
            )}
            <span className={`text-sm md:text-base font-semibold ${change > 0 ? 'text-green-300' : 'text-red-300'}`}>
              {change > 0 && '+'}{change.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-blue-200 text-xs mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}