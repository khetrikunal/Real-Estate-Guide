import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ReferenceCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <section className={cn('reference-section', className)} {...props}>
      {children}
    </section>
  );
}

export function ReferenceCardHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-[var(--ref-border)] px-8 py-7">
      <div className="min-w-0">
        {eyebrow && <div className="reference-eyebrow mb-2">{eyebrow}</div>}
        <h2 className="reference-section-title">{title}</h2>
        {description && <p className="reference-body-copy mt-2 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

export function ReferenceCardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('px-8 py-7', className)}>{children}</div>;
}
