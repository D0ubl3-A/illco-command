"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="fallbackPage">
          <section className="fallbackPanel panel">
            <span className="eyebrow">ILLCO Command</span>
            <h1>The command view needs a refresh.</h1>
            <p>The public funnel is still available. Refresh this route to reload the latest working app list.</p>
            <button className="button primary" type="button" onClick={reset}>Reload Command</button>
          </section>
        </main>
      </body>
    </html>
  );
}
