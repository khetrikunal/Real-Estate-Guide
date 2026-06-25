import { env, joinUrl } from '@app/config/env';
import { tokenStore } from '@app/services/tokenStore';
import type { ApiUser, Project, Role } from '@app/types/domain';

type ProjectRecord = Project & Record<string, unknown>;

export interface ProjectFilters {
  configType?: string;
  sellingType?: string;
  parkingAvailable?: boolean;
  city?: string;
  area?: string;
  completion?: number;
}

export const completionSteps = Array.from({ length: 21 }, (_, index) => index * 5);

export function normalizeCompletion(value: number) {
  return Math.max(0, Math.min(100, Math.round(value / 5) * 5));
}

function idValue(value: unknown) {
  return value === undefined || value === null || value === '' ? '' : String(value);
}

function fieldText(project: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = project[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function sameId(a: unknown, b: unknown) {
  const left = idValue(a);
  const right = idValue(b);
  return !!left && !!right && left === right;
}

function sameText(a: unknown, b: unknown) {
  return typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normalizedListing(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'rental') return 'rent';
  return text;
}

function configValues(project: Project) {
  return Array.isArray(project.configs) ? project.configs : [];
}

function numericField(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function projectName(project: Project) {
  return String(project.projectName ?? project.name ?? 'Unnamed project');
}

export function projectCity(project: Project) {
  return fieldText(project as ProjectRecord, ['city', 'projectCity', 'assignedCity']);
}

export function projectArea(project: Project) {
  return fieldText(project as ProjectRecord, ['area', 'locality', 'projectArea', 'assignedArea']);
}

export function projectPincode(project: Project) {
  return fieldText(project as ProjectRecord, ['pincode', 'pinCode', 'zipCode', 'postalCode']);
}

export function projectCoverUrl(project: Project) {
  const raw = (project as ProjectRecord).coverPhotoUrl ?? (project as ProjectRecord).pfpUrl ?? (project as ProjectRecord).imageUrl;
  return resolveMediaUrl(typeof raw === 'string' ? raw : undefined);
}

export function resolveMediaUrl(rawUrl?: string) {
  const value = rawUrl?.trim();
  if (!value) return '';
  const withToken = appendDownloadToken(value);
  if (/^(blob:|data:image\/)/i.test(value)) return value;
  if (value.startsWith('/api/')) return withToken;
  if (value.startsWith('/')) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:') return appendDownloadToken(parsed.toString());
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) return appendDownloadToken(parsed.toString());
    return '';
  } catch {
    return appendDownloadToken(joinUrl(env.apiBaseUrl, value));
  }
}

function appendDownloadToken(url: string) {
  if (!url.includes('/api/documents/download/') || url.includes('sig=') || url.includes('token=')) {
    return url;
  }
  const token = tokenStore.get();
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

export const safeMediaUrl = resolveMediaUrl;

export function signedDocumentUrl(doc: Record<string, unknown>) {
  const signed = doc.fileUrl ?? doc.downloadUrl ?? doc.url;
  if (typeof signed === 'string' && signed) return resolveMediaUrl(signed);
  const id = doc.id;
  return id === undefined || id === null ? '' : `/api/documents/download/${id}`;
}

export function roleScopedProjects(projects: Project[], role: Role, user?: ApiUser | null) {
  if (role === 'superadmin') return projects;

  const userRecord = (user ?? {}) as Record<string, unknown>;
  const userId = userRecord.id ?? userRecord.userId ?? userRecord.employeeId ?? userRecord.adminId ?? userRecord.subadminId;
  const userCity = userRecord.city ?? userRecord.assignedCity ?? userRecord.location;
  const userArea = userRecord.area ?? userRecord.assignedArea;

  const scoped = projects.filter((project) => {
    const p = project as ProjectRecord;
    if (sameId(p.addedById, userId) || sameId(p.uploadedBy, userId) || sameId(p.uploaderId, userId)) return true;

    if (role === 'admin') {
      if (sameId(p.adminId, userId) || sameId(p.ownerAdminId, userId)) return true;
      if (String(p.addedByRole ?? '').toLowerCase() === 'admin') return true;
    }

    if (role === 'subadmin') {
      if (sameId(p.subadminId, userId) || sameId(p.brokerId, userId) || sameId(p.assignedSubadminId, userId)) return true;
      if (String(p.addedByRole ?? '').toLowerCase() === 'subadmin') return true;
    }

    if (role === 'employee') {
      if (sameId(p.employeeId, userId) || sameId(p.assignedEmployeeId, userId) || sameId(p.assignedToId, userId)) return true;
    }

    if (sameText(projectCity(project), userCity)) {
      return !userArea || sameText(projectArea(project), userArea);
    }

    return false;
  });

  return scoped;
}

export function matchesProjectFilters(project: Project, filters: ProjectFilters) {
  const configs = configValues(project);
  const p = project as ProjectRecord;

  if (filters.configType) {
    const expected = filters.configType.trim().toLowerCase();
    const projectType = String(project.propertyType ?? '').trim().toLowerCase();
    const hasConfig = configs.some((config) =>
      [config.propertyType, config.configLabel, config.bhk, config.flatType]
        .some((value) => String(value ?? '').trim().toLowerCase() === expected)
    );
    if (projectType !== expected && !hasConfig) return false;
  }

  if (filters.sellingType) {
    const expected = normalizedListing(filters.sellingType);
    const projectListing = normalizedListing(project.listingType);
    const hasListing = configs.some((config) => normalizedListing(config.listingType) === expected);
    if (projectListing !== expected && !hasListing) return false;
  }

  if (filters.parkingAvailable !== undefined) {
    const hasProjectParking = project.parkingAvailable === filters.parkingAvailable;
    const hasConfigParking = configs.some((config) => config.parkingAvailable === filters.parkingAvailable);
    if (!hasProjectParking && !hasConfigParking) return false;
  }

  if (filters.city && !sameText(projectCity(project), filters.city)) return false;
  if (filters.area && !sameText(projectArea(project), filters.area)) return false;

  if (filters.completion !== undefined) {
    const expected = normalizeCompletion(filters.completion);
    const values = [
      p.completionPercentage,
      ...configs.map((config) => config.completionPercentage),
    ].map(numericField);
    if (Math.max(...values, 0) < expected) return false;
  }

  return true;
}

export function rankProjects(projects: Project[], query: string) {
  const q = query.trim().toLowerCase();
  const matchScore = (value: unknown, exact: number, starts: number, partial: number) => {
    const text = String(value ?? '').trim().toLowerCase();
    if (!q || !text) return 0;
    if (text === q) return exact;
    if (text.startsWith(q)) return starts;
    return text.includes(q) ? partial : 0;
  };

  const score = (project: Project) => {
    if (!q) return 0;
    const p = project as ProjectRecord;
    const configs = Array.isArray(project.configs) ? project.configs : [];
    let value = 0;

    value += matchScore(projectName(project), 320, 260, 210);
    value += matchScore(p.propertyName, 310, 250, 200);

    value += matchScore(p.address, 190, 170, 150);
    value += matchScore(projectCity(project), 185, 165, 145);
    value += matchScore(projectPincode(project), 180, 160, 140);
    value += matchScore(projectArea(project), 175, 155, 135);

    for (const config of configs) {
      value += matchScore(config.configLabel, 120, 105, 90);
      value += matchScore(config.bhk, 118, 103, 88);
      value += matchScore(config.propertyType, 112, 98, 84);
      value += matchScore(config.flatType, 108, 94, 80);
      value += matchScore(config.listingType, 104, 90, 76);
    }

    value += matchScore(p.listingType, 70, 60, 45);
    value += matchScore(p.propertyType, 68, 58, 43);
    value += matchScore(p.state, 36, 30, 24);
    value += matchScore(p.status, 32, 26, 20);
    value += matchScore(p.description, 24, 18, 12);
    return value;
  };

  return [...projects].sort((a, b) => {
    const byScore = score(b) - score(a);
    if (byScore !== 0) return byScore;
    const byUpdated = Date.parse(String((b as ProjectRecord).updatedAt ?? (b as ProjectRecord).createdAt ?? '')) -
      Date.parse(String((a as ProjectRecord).updatedAt ?? (a as ProjectRecord).createdAt ?? ''));
    if (!Number.isNaN(byUpdated) && byUpdated !== 0) return byUpdated;
    return projectName(a).localeCompare(projectName(b));
  });
}

export function projectMatchesSearch(project: Project, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const p = project as ProjectRecord;
  const configs = Array.isArray(project.configs) ? project.configs : [];
  const fields = [
    projectName(project),
    p.propertyName,
    p.address,
    projectCity(project),
    projectPincode(project),
    projectArea(project),
    project.propertyType,
    project.listingType,
    p.state,
    p.status,
    p.description,
    ...configs.flatMap((config) => [
      config.configLabel,
      config.bhk,
      config.propertyType,
      config.flatType,
      config.listingType,
    ]),
  ];
  return fields.some((field) => String(field ?? '').toLowerCase().includes(q));
}

export function projectConfigSummary(project: Project) {
  const configs = Array.isArray(project.configs) ? project.configs : [];
  const labels = configs
    .map((config) => String(config.configLabel ?? config.bhk ?? config.flatType ?? config.propertyType ?? '').trim())
    .filter(Boolean);
  if (labels.length > 0) return Array.from(new Set(labels)).slice(0, 3).join(', ');
  return String((project as ProjectRecord).propertyType ?? project.listingType ?? 'Configuration pending');
}

export function projectPriceRange(project: Project) {
  const values = [
    project.price,
    ...(Array.isArray(project.configs) ? project.configs.map((config) => config.price) : []),
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
