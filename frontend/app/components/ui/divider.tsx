import { cn } from '@/lib/utils';

interface DividerProps {
  /** Optional center label; renders a three-segment row when provided */
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="h-px flex-1 bg-vertra-border/40" />
        <span className="text-xs text-vertra-text-dim">{label}</span>
        <div className="h-px flex-1 bg-vertra-border/40" />
      </div>
    );
  }

  return <div className={cn('h-px w-full bg-vertra-border/40', className)} />;
}

export type { DividerProps };
