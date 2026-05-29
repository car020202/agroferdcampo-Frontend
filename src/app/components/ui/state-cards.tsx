import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './card';

export interface StateCardMetric {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

interface Props {
  cards: StateCardMetric[];
}

export function StateCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.label} 
            className="relative overflow-hidden p-5 bg-[var(--card)] border-[var(--border)] shadow-sm rounded-xl flex flex-col hover:shadow-md transition-shadow"
          >
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5" 
              style={{ backgroundColor: card.color }}
            />
            <div className="pl-2 flex flex-col h-full justify-between gap-2">
              <div className="flex items-center justify-between opacity-80">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-sec)]">
                  {card.label}
                </span>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div className="text-3xl font-black text-[var(--text-main)]">
                {card.value}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
