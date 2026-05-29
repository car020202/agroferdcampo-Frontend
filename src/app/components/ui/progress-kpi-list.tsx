import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './card';

export interface ProgressKPI {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  progress?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

interface Props {
  kpis: ProgressKPI[];
}

export function ProgressKPIList({ kpis }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="p-4 bg-[var(--card)] border-[var(--border)] shadow-sm rounded-2xl flex flex-col justify-between gap-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-sec)]">
                  {kpi.label}
                </span>
              </div>
              {kpi.trend && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.trend.isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                  {kpi.trend.isPositive ? '+' : '-'}{kpi.trend.value}%
                </span>
              )}
            </div>
            
            <div>
              <div className="text-2xl font-black text-[var(--text-main)] mb-1 relative z-10">
                {kpi.value}
              </div>
              
              {kpi.subtitle && (
                <p className="text-[10px] text-[var(--text-sec)] font-medium mt-2 truncate relative z-10">
                  {kpi.subtitle}
                </p>
              )}
            </div>

            {/* Decorative Sparkline Background */}
            <div className="absolute bottom-0 right-0 left-0 h-16 overflow-hidden rounded-b-2xl pointer-events-none opacity-[0.15]">
              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 30">
                <defs>
                  <linearGradient id={`grad-${kpi.label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={kpi.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={kpi.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,30 L5,25 L15,28 L25,20 L35,22 L50,12 L65,18 L80,8 L90,12 L100,5 L100,30 Z"
                  fill={`url(#grad-${kpi.label.replace(/\s+/g, '')})`}
                />
                <path
                  d="M0,30 L5,25 L15,28 L25,20 L35,22 L50,12 L65,18 L80,8 L90,12 L100,5"
                  fill="none"
                  stroke={kpi.color}
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
