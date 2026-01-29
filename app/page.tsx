export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-border bg-card pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-card lg:p-4">
          Novel Continuation Studio&nbsp;
          <code className="font-mono font-bold">v0.1.0</code>
        </p>
      </div>

      <div className="relative flex place-items-center">
        <h1 className="text-6xl font-bold tracking-tighter text-primary">
          COMMAND CENTER
        </h1>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-border hover:bg-card">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Status{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50 text-muted-foreground`}>
            System initialized. Waiting for input.
          </p>
        </div>
      </div>
    </main>
  );
}