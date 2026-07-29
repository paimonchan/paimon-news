import type { MetadataRoute } from "next";
import { getContainer } from "@/infrastructure/container";
import { config } from "@/infrastructure/config";
import { CATEGORIES } from "@/domain/categorize";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.baseUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/terkini",
    "/digest",
    "/sumber",
    ...CATEGORIES.map((c) => `/kategori/${c.slug}`),
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const { stories } = await getContainer().queries.getTopStories(1, 50);
  const storyRoutes: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${base}/story/${s.id}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...storyRoutes];
}
