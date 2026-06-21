"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fallbackPage">
      <section className="panel fallbackPanel">
        <span className="brandGlyph">IC</span>
        <h1>ILLCO Command is loading a fresh command view.</h1>
        <p>
          The public funnel is available for working app proof, fast demo videos, and enterprise setup. If this browser
          session stalled, reload the page or send a setup request from the main site.
        </p>
        <div className="heroActions">
          <button className="button primary" type="button" onClick={reset}>Reload Command</button>
          <a className="button secondary" href="/">Return Home</a>
        </div>
      </section>
    </main>
  );
}
