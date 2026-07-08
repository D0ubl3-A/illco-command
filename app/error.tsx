"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="bg-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl rounded-[8px] border border-white/10 bg-white/[0.04] p-6">
          <div className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
            ILLCO AI App Store
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">The storefront needs a refresh.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Reload the page to restore the catalog. The Google OAuth and ChatGPT routes remain in place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-[8px] border border-cyan-400/35 bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950"
              type="button"
              onClick={reset}
            >
              Reload store
            </button>
            <a className="inline-flex items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white" href="/">
              Return home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
