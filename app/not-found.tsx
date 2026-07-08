export default function NotFoundPage() {
  return (
    <main id="main-content" className="bg-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl rounded-[8px] border border-white/10 bg-white/[0.04] p-6">
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
            ILLCO AI App Store
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">That route is not available.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Return to the storefront to browse apps, tools, and account access.</p>
          <a className="mt-6 inline-flex items-center justify-center rounded-[8px] border border-cyan-400/35 bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950" href="/">
            Open store
          </a>
        </div>
      </section>
    </main>
  );
}
