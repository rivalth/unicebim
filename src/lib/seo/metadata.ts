import type { Metadata } from "next";
import { LOGO_URLS } from "@/components/brand/logo";

const siteName = "UniCebim";
const siteDescription =
  "Üniversite öğrencileri için modern bütçe ve harcama takip uygulaması. Gelir ve giderlerini kategorilere ayır, aylık hedef bütçe belirle ve harcama alışkanlıklarını net bir şekilde gör.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://unicebim.com";

/**
 * Generates comprehensive metadata for pages.
 *
 * @param options - Metadata options
 * @returns Complete metadata object with Open Graph and Twitter Cards
 */
export function generateMetadata(options?: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const title = options?.title
    ? `${options.title} | ${siteName}`
    : `${siteName} - Öğrenci Bütçe Takip Uygulaması`;
  const description = options?.description || siteDescription;
  const url = options?.path ? `${siteUrl}${options.path}` : siteUrl;
  const image = options?.image || `${siteUrl}/og-image.png`;

  return {
    title,
    description,
    keywords: [
      "öğrenci bütçe",
      "harcama takibi",
      "bütçe yönetimi",
      "üniversite öğrencisi",
      "finansal takip",
      "gider yönetimi",
      "gelir takibi",
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: url,
      languages: {
        "tr-TR": url,
      },
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: {
      index: !options?.noIndex,
      follow: !options?.noIndex,
      googleBot: {
        index: !options?.noIndex,
        follow: !options?.noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: LOGO_URLS.ico, sizes: "any" },
        { url: LOGO_URLS.png, sizes: "32x32", type: "image/png" },
        { url: LOGO_URLS.png, sizes: "192x192", type: "image/png" },
      ],
      apple: [
        { url: LOGO_URLS.png, sizes: "180x180", type: "image/png" },
      ],
    },
  };
}

