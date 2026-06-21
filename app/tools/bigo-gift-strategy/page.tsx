import type { Metadata } from "next";

import { BigoExtensionToken } from "@/components/bigo-gift-strategy/bigo-extension-token";
import { BigoGiftStrategyImporter } from "@/components/bigo-gift-strategy/bigo-gift-strategy-importer";
import { getCurrentUser } from "@/lib/user-accounts";

export const metadata: Metadata = {
  title: "BIGO Gift Strategy",
  description:
    "Authenticated ILLCO tool for exporting BIGO received gift records and contributing consented records into OpenAI Agent SDK powered strategy workflows.",
};

export const dynamic = "force-dynamic";

const bigoHistoryUrl = "https://www.bigo.tv/bigolivepay-recharge/live/history/indexCommonDiamonds.html";

export default async function BigoGiftStrategyPage() {
  const currentUser = await getCurrentUser();
  const returnTo = encodeURIComponent("/tools/bigo-gift-strategy");

  if (!currentUser) {
    return (
      <div className="fallbackPage appLandingPage">
        <div className="workspace appLandingWorkspace bigoStrategyWorkspace">
          <nav className="appLandingNav" aria-label="BIGO strategy navigation">
            <a className="brandBlock" href="/tools">
              <span className="brandGlyph">IC</span>
              <strong>ILLCO Tools</strong>
            </a>
            <div>
              <a className="button secondary" href="/tools">Back to Tools</a>
              <a className="button primary" href={`/account?returnTo=${returnTo}`}>Sign In</a>
            </div>
          </nav>

          <section className="panel bigoStrategyHero">
            <span className="readinessPill pending">Login required</span>
            <h1>BIGO Gift Strategy</h1>
            <p>
              Sign into the same ILLCO account first. The Chrome extension checks this session before it scrolls the BIGO gift history page.
            </p>
            <a className="button primary" href={`/account?returnTo=${returnTo}`}>Continue to login</a>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="fallbackPage appLandingPage">
      <div className="workspace appLandingWorkspace bigoStrategyWorkspace">
        <nav className="appLandingNav" aria-label="BIGO strategy navigation">
          <a className="brandBlock" href="/tools">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Tools</strong>
          </a>
          <div>
            <a className="button secondary" href="/tools">Back to Tools</a>
            <a className="button secondary" href="/account">Account</a>
            <a className="button primary" href="#install">Install Extension</a>
          </div>
        </nav>

        <section className="panel bigoStrategyHero">
          <div>
            <span className="readinessPill ready">Signed in as {currentUser.email}</span>
            <h1>BIGO Gift Strategy</h1>
            <p>
              Export visible received gift records from BIGO, then contribute the records into an ILLCO strategy workflow powered by the OpenAI Agent SDK.
            </p>
            <div className="heroProofBadges" aria-label="BIGO strategy system">
              <span><strong>Chrome</strong> scroll/export</span>
              <span><strong>ILLCO</strong> account gate</span>
              <span><strong>Agent SDK</strong> strategy layer</span>
            </div>
          </div>
          <div className="bigoStrategyCommandCard">
            <span>Current flow</span>
            <strong>Login - scan - export - contribute - strategize</strong>
            <p>The extension does not bypass BIGO login. It reads records already visible to the logged-in user.</p>
          </div>
        </section>

        <section className="bigoStrategyGrid" id="install">
          <article className="panel bigoStrategyStep">
            <span>Step 1</span>
            <h2>Install The Chrome Extension</h2>
            <p>Download the package, unzip it, then load the folder from Chrome extension developer mode.</p>
            <div className="bigoStrategyActions">
              <a className="button primary" href="/downloads/bigo-gift-history-extension.zip" download>
                Download Extension
              </a>
            </div>
            <BigoExtensionToken />
          </article>

          <article className="panel bigoStrategyStep">
            <span>Step 2</span>
            <h2>Open BIGO History</h2>
            <p>Log into BIGO in Chrome, open the received gift history page, then run the extension scan.</p>
            <a className="button primary" href={bigoHistoryUrl} target="_blank" rel="noreferrer">
              Open BIGO Gift History
            </a>
          </article>

          <article className="panel bigoStrategyStep">
            <span>Step 3</span>
            <h2>Use Records For Strategy</h2>
            <p>Export JSON from the extension and paste it below. The strategy contribution is explicit and account-linked.</p>
            <a className="button secondary" href="#contribute">
              Contribute Export
            </a>
          </article>
        </section>

        <section className="panel bigoStrategyAgentPanel">
          <div className="panelHeader">
            <div>
              <h2>OpenAI Agent SDK Strategy Layer</h2>
              <p>
                The app stores consented records as structured strategy input so an agent workflow can summarize gift timing, supporter patterns, repeat-gifter signals, and host follow-up opportunities.
              </p>
            </div>
          </div>
          <div className="bigoStrategySignalGrid">
            <span>Gift frequency windows</span>
            <span>Top supporter cues</span>
            <span>Campaign timing signals</span>
            <span>Training recommendations</span>
          </div>
        </section>

        <BigoGiftStrategyImporter />
      </div>
    </div>
  );
}
