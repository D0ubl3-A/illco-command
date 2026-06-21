import { lastUpdated, type LegalPage as LegalPageContent } from "@/lib/legal-pages";

export function LegalPage({ page }: { page: LegalPageContent }) {
  return (
    <main id="main-content" className="fallbackPage legalPage">
      <div className="workspace legalWorkspace">
        <nav className="appLandingNav" aria-label="Legal navigation">
          <a className="brandBlock" href="/">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO AI</strong>
          </a>
          <div>
            <a className="button secondary" href="/privacy">Privacy</a>
            <a className="button secondary" href="/terms">Terms</a>
            <a className="button primary" href="/account">Account</a>
          </div>
        </nav>

        <section className="panel legalHero">
          <p className="blogEyebrow">ILLCO AI policy</p>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <span>Last updated: {lastUpdated}</span>
        </section>

        <section className="panel legalBody" aria-label={`${page.title} sections`}>
          {page.sections.map((section) => (
            <article className="legalSection" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
