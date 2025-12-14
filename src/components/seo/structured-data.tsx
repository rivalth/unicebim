import type { FAQItem } from "@/components/features/faq-accordion";
import { LOGO_URLS } from "@/components/brand/logo";

const siteName = "UniCebim";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://unicebim.com";
const siteDescription =
  "Üniversite öğrencileri için modern bütçe ve harcama takip uygulaması. Gelir ve giderlerini kategorilere ayır, aylık hedef bütçe belirle ve harcama alışkanlıklarını net bir şekilde gör.";

/**
 * Generates Organization schema for structured data.
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    description: siteDescription,
    url: siteUrl,
    logo: LOGO_URLS.png,
    sameAs: [],
  };
}

/**
 * Generates WebApplication schema for structured data.
 */
export function generateWebApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    description: siteDescription,
    url: siteUrl,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TRY",
    },
    featureList: [
      "Bütçe takibi",
      "Harcama kategorilere ayırma",
      "Gelir-gider raporları",
      "Sabit gider yönetimi",
      "Cüzdan yönetimi",
      "Sosyal skor analizi",
      "Yemekhane endeksi",
    ],
  };
}

/**
 * Generates FAQPage schema for structured data.
 */
export function generateFAQPageSchema(faqItems: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

interface StructuredDataProps {
  data: Record<string, unknown>;
}

/**
 * Component to render structured data as JSON-LD script tag.
 */
export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

