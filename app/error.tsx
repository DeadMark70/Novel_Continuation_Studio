'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-mono text-destructive">
          Runtime Error
        </p>
        <h1 className="text-3xl font-bold tracking-tight">發生未預期錯誤</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          系統執行時發生異常，你可以先重試一次；若問題持續，請回到首頁重新操作。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => reset()}>
            重試
          </Button>
          <Button asChild variant="outline">
            <Link href="/">返回首頁</Link>
          </Button>
        </div>
        {error.message ? (
          <pre className="max-h-40 w-full overflow-auto rounded-md border border-border/70 bg-card/50 p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
      </div>
    </main>
  );
}
