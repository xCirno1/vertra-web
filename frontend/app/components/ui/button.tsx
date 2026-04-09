'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Highlights the button as active (ghost variant only) */
  active?: boolean;
};

type ButtonProps = Omit<HTMLMotionProps<'button'>, keyof ButtonOwnProps> & ButtonOwnProps;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-r from-vertra-cyan to-vertra-teal text-black font-semibold shadow-md shadow-vertra-cyan/20 hover:shadow-lg hover:shadow-vertra-cyan/30 disabled:cursor-not-allowed disabled:opacity-60',
  secondary:
    'border border-vertra-border text-vertra-text-dim hover:border-vertra-border/80 hover:bg-vertra-surface-alt hover:text-vertra-text',
  ghost:
    'text-vertra-text-dim hover:bg-vertra-surface hover:text-vertra-text',
  accent:
    'border border-vertra-cyan/30 bg-vertra-cyan/10 text-vertra-cyan hover:bg-vertra-cyan/20 disabled:opacity-60',
  danger:
    'text-vertra-error/70 hover:bg-vertra-surface hover:text-vertra-error',
  icon:
    'p-1.5 text-vertra-text-dim hover:bg-vertra-surface hover:text-vertra-text rounded',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'gap-1.5 px-2.5 py-1.5 text-xs rounded',
  md: 'gap-2 px-4 py-2.5 text-sm rounded-lg',
  lg: 'gap-2 px-8 py-4 text-base rounded-full',
};

export function Button({
  variant = 'ghost',
  size = 'sm',
  active = false,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center transition-colors cursor-pointer',
        variantStyles[variant],
        variant !== 'icon' && sizeStyles[size],
        variant === 'ghost' && active &&
        'bg-vertra-cyan/20 text-vertra-cyan hover:bg-vertra-cyan/25 hover:text-vertra-cyan',
        'disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export type { ButtonProps, ButtonVariant, ButtonSize };
