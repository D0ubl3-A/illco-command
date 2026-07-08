import type { Metadata } from "next";

import { blogPosts, blogSiteUrl, featuredBlogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "ILLCO AI Blog | Practical SEO Guides That Rank and Convert",
  description:
    "SERP-driven guides for AI automation tools, custom agents, Notion workflows, creator content systems, pricing, lead follow-up automation, and product SEO.",
  alternates: {
    canonical: `${blogSiteUrl}/blog`,
  },
  openGraph: {
    title: "ILLCO AI Blog | illcoai.tech",
    description:
      "Practical AI automation and SEO guides for small businesses, creators, custom agents, Notion systems, and lead follow-up workflows.",
    url: `${blogSiteUrl}/blog`,
    type: "website",
    images: [
      {
        url: `${blogSiteUrl}/blog/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "ILLCO AI blog preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ILLCO AI Blog | illcoai.tech",
    description:
      "Practical AI automation and SEO guides for small businesses, creators, custom agents, Notion systems, and lead follow-up workflows.",
    images: [`${blogSiteUrl}/blog/opengraph-image`],
  },
};

export default function BlogIndexPage() {
  const pillarPost = blogPosts[0];
  const clusterPosts = blogPosts.slice(1);

  return (
    <main id="main-content" className="fallbackPage blogPage">
      <div className="workspace blogWorkspace">
        <nav className="appLandingNav" aria-label="Blog navigation">
          <a className="brandBlock" href="/">
            <span className="brandGlyph">IC</span>
            <strong>ILLCO Command</strong>
          </a>
          <div>
            <a className="button secondary" href="/#services">Services</a>
            <a className="button secondary" href="/commander#apps">Apps</a>
            <a className="button primary" href="/blog/best-ai-automation-tools-for-small-business">
              Start With The Pillar
            </a>
          </div>
        </nav>

        <section className="panel blogHero">
          <div>
            <p className="blogEyebrow">SERP-led AI automation library</p>
            <h1>AI automation articles built to rank and convert.</h1>
            <p>
              This blog targets long-tail searches where small businesses are actively comparing tools, custom agents,
              Notion workflows, pricing, creator systems, and lead follow-up automation.
            </p>
          </div>
          <div className="blogHeroStack" aria-label="SEO cluster summary">
            <span><strong>{blogPosts.length}</strong> articles</span>
            <span><strong>AI automation</strong> topic cluster</span>
            <span><strong>Internal links</strong> to live ILLCO app pages</span>
          </div>
        </section>

        <section className="blogClusterGrid" aria-label="Featured AI automation articles">
          <article className="panel blogPillarCard">
            <span className="blogEyebrow">Pillar article</span>
            <h2>{pillarPost.title}</h2>
            <p>{pillarPost.description}</p>
            <div className="blogMetricRow">
              {pillarPost.heroMetrics.map((metric) => (
                <span key={metric}>{metric}</span>
              ))}
            </div>
            <a className="button primary" href={`/blog/${pillarPost.slug}`}>Read Pillar Guide</a>
          </article>

          <div className="blogFeaturedStack">
            {featuredBlogPosts.slice(1).map((post) => (
              <a className="panel blogFeatureCard" href={`/blog/${post.slug}`} key={post.slug}>
                <span>{post.category}</span>
                <strong>{post.title}</strong>
                <p>{post.serpIntent}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="panel blogArticleList" aria-labelledby="all-ai-automation-guides">
          <div className="panelHeader">
            <div>
              <h2 id="all-ai-automation-guides">All SEO Articles</h2>
              <p>Each article has a primary keyword, search intent, rank angle, FAQ section, sources, and internal links.</p>
            </div>
          </div>
          <div className="blogCardGrid">
            {clusterPosts.map((post) => (
              <a className="blogPostCard" href={`/blog/${post.slug}`} key={post.slug}>
                <span>{post.category}</span>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <dl>
                  <div>
                    <dt>Primary keyword</dt>
                    <dd>{post.primaryKeyword}</dd>
                  </div>
                  <div>
                    <dt>Read time</dt>
                    <dd>{post.readingMinutes} min</dd>
                  </div>
                </dl>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
