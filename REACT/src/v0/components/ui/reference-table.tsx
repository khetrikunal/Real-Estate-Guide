import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ReferenceTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('reference-table overflow-hidden', className)}>{children}</div>;
}

export function ReferenceTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid items-center border-b border-[var(--ref-border)] px-6 py-4 last:border-b-0', className)}>
      {children}
    </div>
  );
}

export function ReferenceTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 text-sm text-[var(--ref-text-muted)]', className)}>{children}</div>;
}
