import type { ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

// Global CSS covers prefers-reduced-motion for class-based UI animation.

/* ─── Empty State ────────────────────────────────── */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon ?? (
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <rect x="10" y="12" width="28" height="24" rx="8" />
            <path d="M16 22h16M16 28h10" />
          </svg>
        )}
      </div>
      <h4>{title}</h4>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

/* ─── Loading Spinner ────────────────────────────── */
export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="loading-indicator" aria-live="polite">
      <div className="skeleton-line wide" />
      <div className="skeleton-line" />
      {message && <p>{message}</p>}
    </div>
  );
}

/* ─── Inline Alert ───────────────────────────────── */
type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const alertIcons: Record<AlertTone, ReactNode> = {
  info: <Info size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  danger: <XCircle size={16} />,
};

export function InlineAlert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div className={`inline-alert ${tone}`}>
      {alertIcons[tone]}
      <span>{children}</span>
    </div>
  );
}

/* ─── Tabs ───────────────────────────────────────── */
interface Tab {
  key: string;
  label: string;
  badge?: number;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tab-item ${active === tab.key ? 'active' : ''}`}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {active === tab.key && <span className="tab-active-indicator" aria-hidden="true" />}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Avatar ─────────────────────────────────────── */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </div>
  );
}

/* ─── Progress Bar ───────────────────────────────── */
export function ProgressBar({ value, max = 100, tone = 'green' }: { value: number; max?: number; tone?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="progress-bar-track">
      <div className={`progress-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
