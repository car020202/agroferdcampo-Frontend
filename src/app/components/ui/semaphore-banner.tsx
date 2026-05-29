import React from 'react';
import { Card } from './card';

export interface SemaphoreMetric {
  label: string;
  value: string | number;
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

interface Props {
  metrics: SemaphoreMetric[];
}

const statusColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-500',
};

export function SemaphoreBanner({ metrics }: Props) {
  return (
    <Card className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[var(--card)] border-[var(--border)] shadow-sm rounded-xl gap-4">
      {metrics.map((m, i) => (
        <React.Fragment key={m.label}>
          <div className="flex-1 flex flex-col items-center sm:items-start w-full text-center sm:text-left px-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[m.status] || statusColors.neutral} shadow-sm`} />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-sec)]">
                {m.label}
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-[var(--text-main)]">
              {m.value}
            </span>
          </div>
          {i < metrics.length - 1 && (
            <div className="hidden sm:block w-px h-12 bg-[var(--border)]" />
          )}
        </React.Fragment>
      ))}
    </Card>
  );
}
