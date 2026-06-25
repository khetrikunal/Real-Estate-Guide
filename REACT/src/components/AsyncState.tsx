import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ApiError } from '../api/client';
import { EmptyState, InlineAlert, LoadingSpinner } from './CommonWidgets';

export function getAsyncErrorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Request failed';
}

export function ForbiddenState({
  title = 'Access restricted',
  subtitle = 'Your role cannot access this view.',
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return <EmptyState icon={<ShieldAlert size={24} />} title={title} subtitle={subtitle} action={action} />;
}

export function ErrorState({ error }: { error: unknown }) {
  const message = getAsyncErrorMessage(error);
  if (!message) return null;
  return <InlineAlert tone="danger">{message}</InlineAlert>;
}

export function AsyncState({
  isLoading,
  error,
  isForbidden,
  isEmpty,
  loadingMessage = 'Loading',
  emptyTitle = 'No data',
  emptySubtitle,
  forbiddenTitle,
  forbiddenSubtitle,
  emptyAction,
  forbiddenAction,
  children,
}: {
  isLoading?: boolean;
  error?: unknown;
  isForbidden?: boolean;
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  forbiddenTitle?: string;
  forbiddenSubtitle?: string;
  emptyAction?: ReactNode;
  forbiddenAction?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) return <LoadingSpinner message={loadingMessage} />;
  if (isForbidden) {
    return <ForbiddenState title={forbiddenTitle} subtitle={forbiddenSubtitle} action={forbiddenAction} />;
  }
  if (error) return <ErrorState error={error} />;
  if (isEmpty) return <EmptyState title={emptyTitle} subtitle={emptySubtitle} action={emptyAction} />;
  return <>{children}</>;
}
