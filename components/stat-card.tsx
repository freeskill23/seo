'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, changeLabel, icon, className }: StatCardProps) {
  const hasChange = change !== undefined && change !== null && change !== 0;
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;

  return (
    <Card className={cn('p-5 hover:shadow-md transition-shadow', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {hasChange && (
        <div className="flex items-center gap-1 mt-2 text-sm">
          <span
            className={cn(
              'flex items-center gap-0.5 font-medium',
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {isPositive && <ArrowUp className="w-3.5 h-3.5" />}
            {isNegative && <ArrowDown className="w-3.5 h-3.3" />}
            {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5" />}
            {Math.abs(change ?? 0)}
          </span>
          {changeLabel && <span className="text-gray-400 text-xs">{changeLabel}</span>}
        </div>
      )}
    </Card>
  );
}
