import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { type BlogPost, blogPosts, blogSiteUrl, headingId } from "@/lib/blog-posts";
import { newsBlogPosts } from "@/lib/news-blog-posts";
import { type VisualBlogPost, viralBlogPosts } from "@/lib/viral-blog-posts";

type BlogArticlePageProps = { params: Promise<{ slug: string }> };

const allBlogPosts: VisualBlogPost[] = [
  ...viralBlogPosts,
  ...(newsBlogPosts as VisualBlogPost[]),
  ...(blogPosts as VisualBlogPost[]),
];

function getPost(slug: string) {
  return allBlogPosts.find((post) => post.slug === slug) || null;
}

function getRelated(post: BlogPost) {
  const linkedSlugs = new Set(
    post.internalLinks
      .map((link) => link.href.match(/^\/blog\/([^/]+)$/)?.[1])
      .filter((value): value is string => Boolean(value)),
  );
  const explicit = allBlogPosts.filter((candidate) => candidate.slug !== post.slug && linkedSlugs.has(candidate.slug));
  const sameCategory = allBlogPosts.filter(
    (candidate) => candidate.slug !== post.slug && candidate.category === post.category && !linkedSlugs.has(candidate.slug),
  );
  const fallback = allBlogPosts.filter(
    (candidate) => candidate.slug !== post.slug && candidate.category !== post.category && !linkedSlugs.has(candidate.slug),
  );
  return [...explicit, ...sameCategory, ...fallback].slice(0, 3);
}

export function generateStaticParams() {
  return allBlogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const canonical = `${blogSiteUrl}/blog/${post.slug}`;
  const socialImage = post.socialImage ? `${blogSiteUrl}${post.socialImage}` : `${canonical}/opengraph-image`;
  return {
    title: post.title,
    description: post.description,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords],
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonical,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ["ILLCO AI"],
      images: [{ url: socialImage, width: 1200, height: 630, alt: `${post.title} - ILLCO AI` }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [socialImage],
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const canonical = `${blogSiteUrl}/blog/${post.slug}`;
  const socialImage = post.socialImage ? `${blogSiteUrl}${post.socialImage}` : `${canonical}/opengraph-image`;
  const relatedPosts = getRelated(post);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "ILLCO AI", url: blogSiteUrl },
    publisher: { "@type": "Organization", name: "ILLCO AI", url: blogSiteUrl },
    mainEntityOfPage: canonical,
    image: socialImage,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
    about: post.category,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ILLCO AI", item: blogSiteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${blogSiteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <main id="main-content" className="fallbackPage blogPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="workspace blogWorkspace">
        <nav className="appLandingNav" aria-label="Article navigation">
          <a className="brandBlock" href="/"><span className="brandGlyph">IC</span><strong>ILLCO Command</strong></a>
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
            <dl className="blogArticleFacts" aria-label="Article facts">
              <div><dt>Primary keyword</dt><dd>{post.primaryKeyword}</dd></div>
              <div><dt>Audience</dt><dd>{post.audience}</dd></div>
              <div><dt>Updated</dt><dd>{post.updatedAt}</dd></div>
              <div><dt>Read time</dt><dd>{post.readingMinutes} min</dd></div>
            </dl>
          </header>

          {post.heroImage ? (
            <figure style={{ margin: "0 0 28px", overflow: "hidden", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.12)", background: "#05070b" }}>
              <img
                src={post.heroImage.src}
                alt={post.heroImage.alt}
                width="1200"
                height="630"
                fetchPriority="high"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
              {post.heroImage.caption ? <figcaption style={{ padding: "14px 18px", color: "#aab6c4", fontSize: "0.95rem" }}>{post.heroImage.caption}</figcaption> : null}
            </figure>
          ) : null}

          <section className="blogIntentPanel" aria-label="Editorial strategy">
            <div><span>SERP intent</span><p>{post.serpIntent}</p></div>
            <div><span>Rank angle</span><p>{post.rankAngle}</p></div>
          </section>

          <section className="blogTakeaways" aria-labelledby="key-takeaways">
            <h2 id="key-takeaways">Key Takeaways</h2>
            <ul>{post.takeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}</ul>
          </section>

          {post.comparisonImages?.length ? (
            <section aria-labelledby="real-images-comparison" style={{ margin: "32px 0" }}>
              <span className="blogSectionEyebrow">The actual images</span>
              <h2 id="real-images-comparison">Original lizard vs. AI-generated hummingbird</h2>
              <p>These are the real files from the experiment, not replacement stock photos.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "20px" }}>
                {post.comparisonImages.map((image) => (
                  <figure key={image.src} style={{ margin: 0, overflow: "hidden", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
                    <img src={image.src} alt={image.alt} loading="lazy" style={{ display: "block", width: "100%", height: "auto" }} />
                    <figcaption style={{ padding: "16px 18px" }}>
                      <strong style={{ display: "block", marginBottom: "8px", color: "#f5f7fa" }}>{image.label}</strong>
                      <span style={{ color: "#aab6c4" }}>{image.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <div className="blogArticleLayout">
            <aside className="blogToc" aria-label="Table of contents">
              <strong>On this page</strong>
              {post.sections.map((section) => <a href={`#${headingId(section.heading)}`} key={section.heading}>{section.heading}</a>)}
              <a href="#faq">FAQ</a>
              <a href="#sources">Sources</a>
            </aside>

            <div className="blogArticleBody">
              {post.sections.map((section) => (
                <section id={headingId(section.heading)} key={section.heading}>
                  {section.eyebrow ? <span className="blogSectionEyebrow">{section.eyebrow}</span> : null}
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
                  {section.callout ? <div className="blogCallout">{section.callout}</div> : null}
                </section>
              ))}

              <section id="faq" className="blogFaq">
                <h2>FAQ</h2>
                {post.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
              </section>

              <section className="blogInternalLinks" aria-labelledby="recommended-next-steps">
                <h2 id="recommended-next-steps">Recommended Next Steps</h2>
                <div>
                  {post.internalLinks.map((link) => (
                    <a href={link.href} key={`${link.href}-${link.label}`}><strong>{link.label}</strong><span>{link.description}</span></a>
                  ))}
                </div>
              </section>

              <section id="sources" className="blogSources">
                <h2>Sources</h2>
                <ul>{post.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
              </section>
            </div>
          </div>
        </article>

        <section className="panel blogArticleList" aria-labelledby="related-guides">
          <div className="panelHeader"><div><h2 id="related-guides">Related Guides</h2><p>Continue through the ILLCO AI news and automation library.</p></div></div>
          <div className="blogCardGrid">
            {relatedPosts.map((related) => (
              <a className="blogPostCard" href={`/blog/${related.slug}`} key={related.slug}>
                {related.heroImage ? <img src={related.heroImage.src} alt="" loading="lazy" style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "14px", marginBottom: "14px" }} /> : null}
                <span>{related.category}</span><h3>{related.title}</h3><p>{related.description}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
