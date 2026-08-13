import type { Metadata } from "next";

const siteUrl = "https://illcoai.tech";
const canonical = `${siteUrl}/henderson-ai-automation`;

export const metadata: Metadata = {
  title: "AI Automation in Henderson, NV | iLLCo AI",
  description:
    "Practical AI automation for Henderson, Nevada small businesses: lead intake, follow-up, scheduling, customer support, reporting, and human-in-the-loop workflows.",
  keywords: [
    "Henderson AI automation",
    "AI automation Henderson NV",
    "Henderson Nevada AI automation",
    "AI automation for small business Henderson",
    "AI automation consultant Henderson NV",
  ],
  alternates: { canonical },
  openGraph: {
    title: "AI Automation in Henderson, NV | iLLCo AI",
    description:
      "Practical AI automation systems for Henderson small businesses, with clear human review and measurable workflow outcomes.",
    url: canonical,
    type: "website",
    images: [{ url: `${siteUrl}/blog/opengraph-image`, width: 1200, height: 630, alt: "iLLCo AI Henderson AI automation" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Automation in Henderson, NV | iLLCo AI",
    description: "Practical AI automation for Henderson small businesses.",
    images: [`${siteUrl}/blog/opengraph-image`],
  },
};

const workflows = [
  {
    title: "Lead intake and qualification",
    body: "Capture inquiries, normalize the details, route the request, and notify the right person without forcing a small team to monitor every channel manually.",
  },
  {
    title: "Lead follow-up",
    body: "Create fast, structured follow-up after forms, calls, consultations, or missed inquiries while preserving a human handoff for sensitive or high-value conversations.",
  },
  {
    title: "Appointment and scheduling workflows",
    body: "Connect intake, qualification, calendar availability, reminders, and internal handoff so scheduling becomes a workflow instead of a string of manual messages.",
  },
  {
    title: "Customer support triage",
    body: "Use AI to classify common questions, retrieve approved information, draft responses, and escalate requests that need a person rather than pretending every ticket should be automated.",
  },
  {
    title: "Document and data processing",
    body: "Extract structured information from routine documents, forms, notes, and submissions, then route the result into the system your team already uses.",
  },
  {
    title: "Reporting and internal summaries",
    body: "Turn recurring operational data into concise summaries, alerts, and next-step queues so owners can review exceptions instead of rebuilding the same report every week.",
  },
];

const faq = [
  {
    question: "What is AI automation for a small business?",
    answer:
      "AI automation combines software workflows with AI tasks such as classification, summarization, drafting, routing, and information retrieval. The goal is to reduce repetitive work while keeping important decisions and exceptions visible to a person.",
  },
  {
    question: "What should a Henderson business automate first?",
    answer:
      "Start with one repeated workflow tied to response speed, revenue, or administrative load. Lead intake, follow-up, scheduling, support triage, reporting, and document processing are common first candidates.",
  },
  {
    question: "Should every business process use AI?",
    answer:
      "No. High-risk decisions, sensitive customer situations, unusual exceptions, and work requiring accountable human judgment should keep clear review and escalation points.",
  },
  {
    question: "Does iLLCo AI only work with Henderson businesses?",
    answer:
      "This page focuses on Henderson, Nevada because iLLCo AI is building local relationships and practical small-business automation resources for the Henderson market. The underlying workflow approach can also apply to businesses in other locations.",
  },
];

export default function HendersonAiAutomationPage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "iLLCo AI",
    url: siteUrl,
    description: "AI automation systems and practical workflow implementation for small businesses.",
    areaServed: {
      "@type": "City",
      name: "Henderson",
      containedInPlace: { "@type": "State", name: "Nevada" },
    },
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#service`,
    name: "AI Automation for Henderson Businesses",
    provider: { "@id": `${siteUrl}/#organization` },
    areaServed: {
      "@type": "City",
      name: "Henderson",
      containedInPlace: { "@type": "State", name: "Nevada" },
    },
    serviceType: "AI automation and workflow implementation",
    url: canonical,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "iLLCo AI", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Henderson AI Automation", item: canonical },
    ],
  };

  return (
    <main id="main-content" className="fallbackPage blogPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="workspace blogWorkspace">
        <nav className="appLandingNav" aria-label="Henderson AI automation navigation">
          <a className="brandBlock" href="/">
            <span className="brandGlyph">IA</span>
            <strong>iLLCo AI</strong>
          </a>
          <div>
            <a className="button secondary" href="/blog">AI Guides</a>
            <a className="button secondary" href="/#services">Services</a>
            <a className="button primary" href="/#services">Discuss a Workflow</a>
          </div>
        </nav>

        <section className="panel blogHero">
          <div>
            <p className="blogEyebrow">Henderson, Nevada · AI automation</p>
            <h1>AI automation for Henderson businesses that need working workflows—not another pile of tools.</h1>
            <p>
              iLLCo AI focuses on practical business automation: lead intake, follow-up, scheduling, support triage,
              document processing, reporting, and clear human handoffs when judgment matters.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
              <a className="button primary" href="/#services">Explore AI Automation</a>
              <a className="button secondary" href="/blog/henderson-ai-automation-guide">Read the Henderson Guide</a>
            </div>
          </div>
          <div className="blogHeroStack" aria-label="Henderson AI automation principles">
            <span><strong>1 workflow first</strong> before adding more software</span>
            <span><strong>Human review</strong> for exceptions and sensitive decisions</span>
            <span><strong>Measurable outcome</strong> tied to speed, workload, or revenue protection</span>
          </div>
        </section>

        <section className="panel blogArticle" aria-labelledby="henderson-workflows">
          <header className="blogArticleHeader">
            <div>
              <p className="blogEyebrow">Practical use cases</p>
              <h2 id="henderson-workflows">What Henderson small businesses can automate first</h2>
              <p>
                The best starting point is usually a repeated process that consumes time or causes leads, requests,
                or internal work to stall between systems.
              </p>
            </div>
          </header>

          <div className="blogCardGrid">
            {workflows.map((workflow) => (
              <article className="blogPostCard" key={workflow.title}>
                <span>AI workflow</span>
                <h3>{workflow.title}</h3>
                <p>{workflow.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel blogArticle">
          <div className="blogArticleBody" style={{ maxWidth: 900, margin: "0 auto" }}>
            <section>
              <span className="blogSectionEyebrow">A better implementation rule</span>
              <h2>Automate the handoff, not just the prompt</h2>
              <p>
                A useful automation has a trigger, approved inputs, an AI or rules step when appropriate, a destination,
                an owner, an error path, and a measurable result. A chatbot demo without those pieces is not a business system.
              </p>
              <p>
                For a Henderson service business, that could mean turning a new inquiry into a structured record,
                classifying what the person needs, preparing the next message, notifying the right owner, and escalating
                anything unusual before it reaches the customer.
              </p>
            </section>

            <section>
              <span className="blogSectionEyebrow">Human-in-the-loop</span>
              <h2>Where AI should stop</h2>
              <p>
                Good automation does not pretend every decision belongs to a model. Keep human review for unusual cases,
                sensitive customer situations, contractual or financial commitments, safety-critical decisions, and anything
                where accountability matters more than speed.
              </p>
            </section>

            <section>
              <span className="blogSectionEyebrow">Local resource</span>
              <h2>Start with the Henderson AI automation guide</h2>
              <p>
                The supporting guide maps seven workflows a small business can evaluate first, along with a simple framework
                for deciding whether to use native AI, workflow software, or a custom agent.
              </p>
              <a className="button primary" href="/blog/henderson-ai-automation-guide">Read the Henderson Guide</a>
            </section>

            <section id="faq" className="blogFaq">
              <h2>Henderson AI Automation FAQ</h2>
              {faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
