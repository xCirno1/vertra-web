import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Icon node displayed inside the card (typically a Lucide icon) */
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 text-center', className)}>
      <div className="mb-4 rounded-xl border border-vertra-border/40 bg-vertra-surface/50 p-5">
        {icon}
      </div>
      <p className="text-base font-medium text-vertra-text-dim">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-vertra-text-dim/60">{description}</p>
      )}
    </div>
  );
}

export type { EmptyStateProps };
