'use client';

import { useEffect } from 'react';
import { useNovelStore } from '@/store/useNovelStore';

export function useNovelPersistenceLifecycle(): void {
  useEffect(() => {
    const flushIfPending = () => {
      const state = useNovelStore.getState();
      if (!state.hasPendingPersist()) {
        return;
      }
      void state.flushPendingPersist();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return;
      }
      flushIfPending();
    };

    const handlePageHide = () => {
      flushIfPending();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);
}
