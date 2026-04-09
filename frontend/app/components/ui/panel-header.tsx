import * as React from 'react';
import { cn } from '@/lib/utils';

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  /** Nodes rendered on the right side (action buttons, etc.) */
  actions?: React.ReactNode;
  className?: string;
  /** Override the title text classes (e.g. to remove uppercase for Scene Graph) */
  titleClassName?: string;
}

export function PanelHeader({
  title,
  subtitle,
  actions,
  className,
  titleClassName,
}: PanelHeaderProps) {
  return (
    <div className={cn('shrink-0 border-b border-vertra-border/40 px-4 py-3', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={cn(
              'text-xs font-semibold uppercase tracking-wide text-vertra-text-dim',
              titleClassName,
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[11px] text-vertra-text-dim">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export type { PanelHeaderProps };
