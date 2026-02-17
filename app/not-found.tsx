import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-mono text-primary">
          404
        </p>
        <h1 className="text-3xl font-bold tracking-tight">找不到這個頁面</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          你要找的內容不存在，可能已被移除或路徑輸入錯誤。
        </p>
        <Button asChild>
          <Link href="/">回到工作台</Link>
        </Button>
      </div>
    </main>
  );
}
