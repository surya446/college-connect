export type AnnouncementPriority = 'high' | 'medium' | 'low';

export type Announcement = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  priority: AnnouncementPriority;
};

export type AnnouncementFirestore = {
  title?: unknown;
  description?: unknown;
  body?: unknown;
  createdAt?: unknown;
  createdDate?: unknown;
  priority?: unknown;
};
