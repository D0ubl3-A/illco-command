import type { MetadataRoute } from "next";

import { blogPosts } from "@/lib/blog-posts";
import { newsBlogPosts } from "@/lib/news-blog-posts";
import { viralBlogPosts } from "@/lib/viral-blog-posts";
import { products } from "@/lib/deployments";
import { legalPages } from "@/lib/legal-pages";

const siteUrl = "https://illcoai.tech";
const lastModified = new Date();
const allBlogPosts = [...viralBlogPosts, ...newsBlogPosts, ...blogPosts];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/audit-proof`, lastModified, changeFrequency: "weekly", priority: 0.99 },
    { url: `${siteUrl}/lead-rescue`, lastModified, changeFrequency: "weekly", priority: 0.99 },
    { url: `${siteUrl}/youtube-rank-revival`, lastModified, changeFrequency: "weekly", priority: 0.98 },
    { url: `${siteUrl}/dispensary-menu-ai`, lastModified, changeFrequency: "weekly", priority: 0.97 },
    { url: `${siteUrl}/tools`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/tools/lyric-video-forge`, lastModified, changeFrequency: "weekly", priority: 0.84 },
    { url: `${siteUrl}/products`, lastModified, changeFrequency: "daily", priority: 0.96 },
    { url: `${siteUrl}/tools/think-for-me-mode`, lastModified, changeFrequency: "weekly", priority: 0.72 },
    { url: `${siteUrl}/commander`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/master-agent`, lastModified, changeFrequency: "weekly", priority: 0.76 },
    { url: `${siteUrl}/blog`, lastModified, changeFrequency: "daily", priority: 0.9 },
  ];

  const appRoutes = products.map((product) => ({
    url: `${siteUrl}/apps/${product.id}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: product.isLive ? 0.85 : 0.65,
  }));

  const blogRoutes = allBlogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: post.publishedAt === post.updatedAt ? ("weekly" as const) : ("monthly" as const),
    priority: post.slug === "ai-turned-lizard-into-hummingbird-image-enhancement-hallucination" ? 0.98 : 0.86,
  }));

  const legalRoutes = legalPages.map((page) => ({
    url: `${siteUrl}/${page.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  return [...staticRoutes, ...legalRoutes, ...blogRoutes, ...appRoutes];
}
