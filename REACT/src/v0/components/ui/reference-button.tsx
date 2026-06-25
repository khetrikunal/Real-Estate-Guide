import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ReferenceButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

export function ReferenceButton({
  variant = 'secondary',
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ReferenceButtonVariant; children: ReactNode }) {
  return (
    <button
      className={cn(
        variant === 'icon' ? 'reference-icon-button' : `reference-button reference-button-${variant}`,
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
