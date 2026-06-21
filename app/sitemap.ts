import type { MetadataRoute } from "next";

import { blogPosts } from "@/lib/blog-posts";
import { products } from "@/lib/deployments";

const siteUrl = "https://illcoai.tech";
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/tools`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/think-for-me-mode`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: `${siteUrl}/commander`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const appRoutes = products.map((product) => ({
    url: `${siteUrl}/apps/${product.id}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: product.isLive ? 0.85 : 0.65,
  }));

  const blogRoutes = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly" as const,
    priority: post.slug === "best-ai-automation-tools-for-small-business" ? 0.95 : 0.86,
  }));

  return [...staticRoutes, ...blogRoutes, ...appRoutes];
}
