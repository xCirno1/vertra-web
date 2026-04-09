import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'mono';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual style of the badge */
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  /** Subtle pill – used for auth/source status indicators in nav */
  default:
    'inline-flex items-center gap-1.5 rounded-md border border-vertra-border/40 bg-vertra-surface/60 px-2.5 py-1.5 text-xs text-vertra-text-dim',
  /** Slightly more prominent – used for source tags in project list */
  accent:
    'inline-flex items-center gap-1.5 rounded-lg border border-vertra-border/40 bg-vertra-surface/50 px-2.5 py-2 text-xs text-vertra-text-dim',
  /** Monospace highlight – used for engine status tags */
  mono:
    'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono text-vertra-cyan bg-vertra-cyan/10',
};

export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(variantStyles[variant], className)} {...rest}>
      {children}
    </span>
  );
}

export type { BadgeProps, BadgeVariant };
