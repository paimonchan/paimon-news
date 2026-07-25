import type { MetadataRoute } from "next";
import { config } from "@/infrastructure/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/tersimpan", "/login"],
      },
    ],
    sitemap: `${config.baseUrl}/sitemap.xml`,
  };
}
