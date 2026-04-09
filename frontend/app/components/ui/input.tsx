'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon node rendered to the left of the input (wraps in a focus-styled container) */
  leadingIcon?: React.ReactNode;
  /** Extra className applied to the outer container when leadingIcon is present */
  containerClassName?: string;
}

export function Input({ leadingIcon, containerClassName, className, ...rest }: InputProps) {
  const inputClasses = cn(
    'w-full bg-transparent text-sm text-vertra-text outline-none placeholder:text-vertra-text-dim/50',
    className,
  );

  if (leadingIcon) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-lg border border-vertra-border/50 bg-vertra-surface-alt/80 px-3 py-2.5 transition-colors focus-within:border-vertra-cyan/70',
          containerClassName,
        )}
      >
        <span className="shrink-0 text-vertra-text-dim">{leadingIcon}</span>
        <input className={inputClasses} {...rest} />
      </div>
    );
  }

  return <input className={inputClasses} {...rest} />;
}

export type { InputProps };
