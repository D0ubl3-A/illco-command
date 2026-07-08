"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main id="main-content" className="bg-slate-950">
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl rounded-[8px] border border-white/10 bg-white/[0.04] p-6">
              <div className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                ILLCO AI App Store
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">The storefront hit an error.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">Reload the page to retry the current route.</p>
              <button
                className="mt-6 inline-flex items-center justify-center rounded-[8px] border border-cyan-400/35 bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950"
                type="button"
                onClick={reset}
              >
                Reload store
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
