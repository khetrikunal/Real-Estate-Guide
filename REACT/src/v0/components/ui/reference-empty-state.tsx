import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReferenceEmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('reference-card flex min-h-72 flex-col items-center justify-center px-8 py-14 text-center', className)}>
      <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-[var(--ref-border)] bg-[var(--ref-surface-soft)]">
        <Icon className="h-10 w-10 text-[var(--ref-text-muted)]" />
      </div>
      <h3 className="reference-section-title text-[22px]">{title}</h3>
      {description && <p className="reference-muted-copy mt-2 max-w-lg">{description}</p>}
    </div>
  );
}
