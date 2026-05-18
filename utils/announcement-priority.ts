import type { AnnouncementPriority } from '@/types/announcement';

export type PriorityBadgeStyle = {
  backgroundColor: string;
  textColor: string;
  label: string;
};

const PRIORITY_STYLES: Record<AnnouncementPriority, PriorityBadgeStyle> = {
  high: {
    backgroundColor: '#FEF2F2',
    textColor: '#DC2626',
    label: 'High',
  },
  medium: {
    backgroundColor: '#FFFBEB',
    textColor: '#D97706',
    label: 'Medium',
  },
  low: {
    backgroundColor: '#ECFDF5',
    textColor: '#059669',
    label: 'Low',
  },
};

export function normalizePriority(value: unknown): AnnouncementPriority {
  const normalized = String(value ?? 'low').trim().toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  throw new Error('Invalid priority in announcement');
}

export function getPriorityBadgeStyle(priority: AnnouncementPriority): PriorityBadgeStyle {
  return PRIORITY_STYLES[priority];
}
