export const referenceUi = {
  shell: {
    root: 'reference-shell',
    sidebar: 'reference-sidebar',
    topbar: 'reference-topbar',
    content: 'reference-content',
  },
  surfaces: {
    pagePanel: 'reference-page-panel',
    section: 'reference-section',
    card: 'reference-card',
    statCard: 'reference-stat-card',
    table: 'reference-table',
    input: 'reference-input',
  },
  buttons: {
    primary: 'reference-button reference-button-primary',
    secondary: 'reference-button reference-button-secondary',
    ghost: 'reference-button reference-button-ghost',
    icon: 'reference-icon-button',
  },
  text: {
    eyebrow: 'reference-eyebrow',
    h1: 'reference-page-title',
    h2: 'reference-section-title',
    body: 'reference-body-copy',
    muted: 'reference-muted-copy',
    mono: 'reference-mono',
  },
  status: {
    active: 'reference-status reference-status-active',
    pending: 'reference-status reference-status-pending',
    destructive: 'reference-status reference-status-destructive',
    completed: 'reference-status reference-status-completed',
  },
} as const;

export const referenceRouteChrome: Record<string, { eyebrow: string; title: string; description: string }> = {
  followup: {
    eyebrow: 'SUPER ADMIN - DASHBOARD',
    title: 'Follow-ups',
    description:
      'Stay on top of every scheduled customer touchpoint. Reschedule, complete, or delete from a single timeline.',
  },
  search: {
    eyebrow: 'DISCOVERY',
    title: 'Search property',
    description: 'Find matching configurations across projects by BHK, price, area, location, builder, or configuration details.',
  },
  properties: {
    eyebrow: 'INVENTORY',
    title: 'Properties',
    description: 'Manage and add projects across all your locations.',
  },
  sales: {
    eyebrow: 'SUPER ADMIN - DASHBOARD',
    title: 'Sales management',
    description: 'Sell units, track revenue, and review every transaction across the portfolio.',
  },
  admins: {
    eyebrow: 'DIRECTORY',
    title: 'User Management',
    description: 'Manage admins, sub admins, employees, KYC, and access state.',
  },
  locations: {
    eyebrow: 'LOCATIONS',
    title: 'Location Management',
    description: 'Manage project locations for subscription-based access.',
  },
  crm: {
    eyebrow: 'CRM',
    title: 'Lead Management',
    description: 'Track new leads, follow-ups, and pipeline health across the team.',
  },
  map: {
    eyebrow: 'MAP',
    title: 'Project map',
    description: 'Browse role-visible projects by location with bounded zoom and quick project access.',
  },
  addProject: {
    eyebrow: 'PROPERTIES - NEW',
    title: 'Add new project',
    description: 'Create a project listing. You can save as draft and continue later.',
  },
};
