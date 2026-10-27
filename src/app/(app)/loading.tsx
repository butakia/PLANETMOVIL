export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2"><div className="h-36 animate-pulse rounded-3xl bg-slate-200" /><div className="h-36 animate-pulse rounded-3xl bg-slate-200" /></div>
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
