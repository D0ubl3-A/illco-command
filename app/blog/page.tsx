import type { Metadata } from "next";

import { blogPosts, blogSiteUrl } from "@/lib/blog-posts";
import { newsBlogPosts } from "@/lib/news-blog-posts";

const allBlogPosts = [...newsBlogPosts, ...blogPosts];

export const metadata: Metadata = {
  title: "ILLCO AI Blog | AI News, Automation and Small-Business Guides",
  description:
    "Current AI news, platform updates, creator-economy shifts, business technology analysis, and practical AI automation guides for small businesses.",
  alternates: { canonical: `${blogSiteUrl}/blog` },
  openGraph: {
    title: "ILLCO AI Blog | illcoai.tech",
    description:
      "Current AI news and practical implementation guides for small businesses, creators, and lean teams.",
    url: `${blogSiteUrl}/blog`,
    type: "website",
    images: [{ url: `${blogSiteUrl}/blog/opengraph-image`, width: 1200, height: 630, alt: "ILLCO AI blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ILLCO AI Blog | illcoai.tech",
    description: "Current AI news and practical implementation guides for small businesses and creators.",
    images: [`${blogSiteUrl}/blog/opengraph-image`],
  },
};

export default function BlogIndexPage() {
  const featured = newsBlogPosts.slice(0, 3);

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
            <a className="button primary" href={`/blog/${newsBlogPosts[0]?.slug || blogPosts[0].slug}`}>Latest Article</a>
          </div>
        </nav>

        <section className="panel blogHero">
          <div>
            <p className="blogEyebrow">AI news and implementation intelligence</p>
            <h1>Current AI developments—translated into practical business action.</h1>
            <p>
              Verified platform updates, emerging tools, creator-economy shifts, cybersecurity changes, model pricing,
              and small-business AI guidance. Confirmed reporting is separated from ILLCO analysis.
            </p>
          </div>
          <div className="blogHeroStack" aria-label="Blog summary">
            <span><strong>{allBlogPosts.length}</strong> published guides</span>
            <span><strong>{newsBlogPosts.length}</strong> current-news packages added</span>
            <span><strong>Sources + analysis</strong> clearly separated</span>
          </div>
        </section>

        {featured.length ? (
          <section className="blogClusterGrid" aria-label="Featured AI news articles">
            <article className="panel blogPillarCard">
              <span className="blogEyebrow">Latest featured article</span>
              <h2>{featured[0].title}</h2>
              <p>{featured[0].description}</p>
              <div className="blogMetricRow">
                {featured[0].heroMetrics.map((metric) => <span key={metric}>{metric}</span>)}
              </div>
              <a className="button primary" href={`/blog/${featured[0].slug}`}>Read Latest Analysis</a>
            </article>
            <div className="blogFeaturedStack">
              {featured.slice(1).map((post) => (
                <a className="panel blogFeatureCard" href={`/blog/${post.slug}`} key={post.slug}>
                  <span>{post.category}</span>
                  <strong>{post.title}</strong>
                  <p>{post.description}</p>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel blogArticleList" aria-labelledby="all-ai-guides">
          <div className="panelHeader">
            <div>
              <h2 id="all-ai-guides">All AI News and Business Guides</h2>
              <p>Each article includes a target keyword, confirmed facts, business analysis, source links, FAQs, and a practical next step.</p>
            </div>
          </div>
          <div className="blogCardGrid">
            {allBlogPosts.map((post) => (
              <a className="blogPostCard" href={`/blog/${post.slug}`} key={post.slug}>
                <span>{post.category}</span>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <dl>
                  <div><dt>Primary keyword</dt><dd>{post.primaryKeyword}</dd></div>
                  <div><dt>Read time</dt><dd>{post.readingMinutes} min</dd></div>
                </dl>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
