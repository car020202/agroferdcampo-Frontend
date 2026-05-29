import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from './badge';

export interface InlinePillMetric {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

interface Props {
  metrics: InlinePillMetric[];
}

export function InlinePills({ metrics }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Badge 
            key={m.label} 
            variant="outline" 
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[var(--card)] border-[var(--border)] shadow-sm transition-all hover:shadow-md"
            style={{ borderColor: `${m.color}30` }}
          >
            <div className="flex items-center justify-center p-1.5 rounded-full" style={{ backgroundColor: `${m.color}15`, color: m.color }}>
              <Icon size={18} />
            </div>
            <span className="text-lg font-black text-[var(--text-main)]">{m.value}</span>
            <span className="text-sm font-bold uppercase tracking-tight text-[var(--text-sec)]">{m.label}</span>
          </Badge>
        );
      })}
    </div>
  );
}
