import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { type BlogPost, blogPosts, blogSiteUrl, getBlogPost, getRelatedPosts, headingId } from "@/lib/blog-posts";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const canonical = `${blogSiteUrl}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords],
    alternates: {
      canonical,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ["ILLCO AI"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const canonical = `${blogSiteUrl}/blog/${post.slug}`;
  const relatedPosts = getRelatedPosts(post);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "ILLCO AI",
      url: blogSiteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "ILLCO Command",
      url: blogSiteUrl,
    },
    mainEntityOfPage: canonical,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
    about: post.category,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ILLCO Command",
        item: blogSiteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${blogSiteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonical,
      },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  const processSteps = extractProcessSteps(post);

  return (
    <main className="fallbackPage blogPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="workspace blogWorkspace">
        <nav className="appLandingNav" aria-label="Article navigation">
          <a className="brandBlock" href="/">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Command</strong>
          </a>
          <div>
            <a className="button secondary" href="/blog">All Articles</a>
            <a className="button secondary" href="/commander#apps">Apps</a>
            <a className="button primary" href="/#services">Request Setup</a>
          </div>
        </nav>

        <article className="panel blogArticle">
          <header className="blogArticleHeader">
            <div>
              <p className="blogEyebrow">{post.category}</p>
              <h1>{post.title}</h1>
              <p>{post.description}</p>
            </div>
            <dl className="blogArticleFacts" aria-label="Article SEO facts">
              <div>
                <dt>Primary keyword</dt>
                <dd>{post.primaryKeyword}</dd>
              </div>
              <div>
                <dt>Audience</dt>
                <dd>{post.audience}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{post.updatedAt}</dd>
              </div>
              <div>
                <dt>Read time</dt>
                <dd>{post.readingMinutes} min</dd>
              </div>
            </dl>
          </header>

          <section className="blogIntentPanel" aria-label="SERP strategy">
            <div>
              <span>SERP intent</span>
              <p>{post.serpIntent}</p>
            </div>
            <div>
              <span>Rank angle</span>
              <p>{post.rankAngle}</p>
            </div>
          </section>

          <section className="blogTakeaways" aria-labelledby="key-takeaways">
            <h2 id="key-takeaways">Key Takeaways</h2>
            <ul>
              {post.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ul>
          </section>

          <div className="blogArticleLayout">
          <aside className="blogToc" aria-label="Table of contents">
            <strong>On this page</strong>
            {post.sections.map((section) => (
              <a href={`#${headingId(section.heading)}`} key={section.heading}>{section.heading}</a>
            ))}
            {processSteps.length ? <a href="#process">Process</a> : null}
            <a href="#faq">FAQ</a>
            <a href="#sources">Sources</a>
          </aside>

            <div className="blogArticleBody">
              {post.sections.map((section) => (
                <section id={headingId(section.heading)} key={section.heading}>
                  {section.eyebrow ? <span className="blogSectionEyebrow">{section.eyebrow}</span> : null}
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.callout ? <div className="blogCallout">{section.callout}</div> : null}
                </section>
              ))}
              {processSteps.length ? (
                <section id="process" className="blogTakeaways">
                  <h2>Process</h2>
                  <ol>
                    {processSteps.map((step, index) => (
                      <li key={`${step}-${index}`}>{step}</li>
                    ))}
                  </ol>
                </section>
              ) : null}

              <section id="faq" className="blogFaq">
                <h2>FAQ</h2>
                {post.faqs.map((faq) => (
                  <details key={faq.question}>
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </section>

              <section className="blogInternalLinks" aria-labelledby="recommended-next-steps">
                <h2 id="recommended-next-steps">Recommended Next Steps</h2>
                <div>
                  {post.internalLinks.map((link) => (
                    <a href={link.href} key={link.href}>
                      <strong>{link.label}</strong>
                      <span>{link.description}</span>
                    </a>
                  ))}
                </div>
              </section>

              <section id="sources" className="blogSources">
                <h2>Sources</h2>
                <ul>
                  {post.sources.map((source) => (
                    <li key={source.href}>
                      <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </article>

        <section className="panel blogArticleList" aria-labelledby="related-guides">
          <div className="panelHeader">
            <div>
              <h2 id="related-guides">Related Guides</h2>
              <p>Keep the cluster tight with internal links across automation tools, agents, pricing, Notion, and lead follow-up.</p>
            </div>
          </div>
          <div className="blogCardGrid">
            {relatedPosts.map((related) => (
              <a className="blogPostCard" href={`/blog/${related.slug}`} key={related.slug}>
                <span>{related.category}</span>
                <h3>{related.title}</h3>
                <p>{related.description}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function extractProcessSteps(post: BlogPost) {
  if (post.workflow && post.workflow.length) return post.workflow;

  const workflowSection = post.sections.find((section) => {
    const heading = section.heading.toLowerCase();
    const eyebrow = section.eyebrow?.toLowerCase() || "";
    return heading.includes("workflow") || heading.includes("process") || eyebrow.includes("workflow") || eyebrow.includes("process");
  });
  if (workflowSection?.bullets?.length) return workflowSection.bullets;

  const explicitStepSection = post.sections.find((section) => section.heading.toLowerCase().includes("step"));
  if (explicitStepSection?.bullets?.length) return explicitStepSection.bullets;

  const fallbackSection = post.sections.find((section) => section.bullets?.length);
  if (fallbackSection?.bullets?.length) return fallbackSection.bullets;

  return post.takeaways.slice(0, 5);
}
