import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://unicebim.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/transactions", "/reports", "/profile"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

