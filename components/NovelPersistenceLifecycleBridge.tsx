'use client';

import { useNovelPersistenceLifecycle } from '@/hooks/useNovelPersistenceLifecycle';

export function NovelPersistenceLifecycleBridge() {
  useNovelPersistenceLifecycle();
  return null;
}
