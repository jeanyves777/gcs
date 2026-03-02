import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.itatgcs.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    { url: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { url: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/services", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/services/managed-it", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/services/software-dev", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/services/enterprise", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/services/cloud", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/services/cybersecurity", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/services/ai-integration", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/portfolio", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
    { url: "/contact", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/get-quote", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/careers", priority: 0.6, changeFrequency: "monthly" as const },
    { url: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { url: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { url: "/cookies", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return staticRoutes.map(({ url, priority, changeFrequency }) => ({
    url: `${baseUrl}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
