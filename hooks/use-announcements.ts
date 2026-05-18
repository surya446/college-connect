import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { db } from '@/firebase/config';
import {
  getAnnouncementsErrorMessage,
  parseAnnouncement,
  sortAnnouncementsByDate,
} from '@/services/announcements';
import type { Announcement, AnnouncementFirestore } from '@/types/announcement';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

type UseAnnouncementsResult = {
  announcements: Announcement[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
  retry: () => void;
};

export function useAnnouncements(): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const announcementsQuery = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        const parsed: Announcement[] = [];
        const parseErrors: string[] = [];

        snapshot.forEach((docSnap) => {
          try {
            parsed.push(parseAnnouncement(docSnap.id, docSnap.data() as AnnouncementFirestore));
          } catch (parseError) {
            console.error('[useAnnouncements] Parse error:', docSnap.id, parseError);
            parseErrors.push(docSnap.id);
          }
        });

        setAnnouncements(sortAnnouncementsByDate(parsed));

        if (parseErrors.length > 0 && parsed.length === 0) {
          setError('Announcements contain invalid data.');
        } else {
          setError(null);
        }

        setIsLoading(false);
        setIsRefreshing(false);
      },
      (snapshotError) => {
        console.error('[useAnnouncements] Firestore error:', snapshotError);
        setAnnouncements([]);
        setError(getAnnouncementsErrorMessage(snapshotError));
        setIsLoading(false);
        setIsRefreshing(false);
      },
    );

    return unsubscribe;
  }, [retryCount]);

  return {
    announcements,
    isLoading,
    isRefreshing,
    error,
    refresh,
    retry,
  };
}
