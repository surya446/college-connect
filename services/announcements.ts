import { Timestamp } from 'firebase/firestore';

import type { Announcement, AnnouncementFirestore, AnnouncementPriority } from '@/types/announcement';
import { normalizePriority } from '@/utils/announcement-priority';

function toString(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`Invalid ${field} in announcement`);
}

function parseCreatedAt(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  throw new Error('Invalid createdAt in announcement');
}

export function parseAnnouncement(id: string, data: AnnouncementFirestore): Announcement {
  const description = data.description
    ? toString(data.description, 'description')
    : toString(data.body, 'body');

  const createdAt = data.createdAt
    ? parseCreatedAt(data.createdAt)
    : parseCreatedAt(data.createdDate);

  const priority: AnnouncementPriority = normalizePriority(data.priority);

  return {
    id,
    title: toString(data.title, 'title'),
    description,
    createdAt,
    priority,
  };
}

export function sortAnnouncementsByDate(records: Announcement[]): Announcement[] {
  return [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function formatAnnouncementDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getAnnouncementsErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'permission-denied':
        return 'You do not have permission to view announcements.';
      case 'failed-precondition':
        return 'A Firestore index is required. Check the Firebase console.';
      case 'unavailable':
        return 'Firestore is temporarily unavailable. Check your connection.';
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to load announcements. Please try again.';
}
