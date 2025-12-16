import { Footer } from "@/components/layout/footer";
import { PublicHeader } from "@/components/layout/public-header";
import { BillSplitter } from "@/components/tools/bill-splitter";
import { generateMetadata } from "@/lib/seo/metadata";

export const metadata = generateMetadata({
  title: "Hesap Bölüştürücü - UniCebim",
  description:
    "Restoran hesabını kolayca bölüştürün. Eşit böl veya kim ne yedi hesapla. WhatsApp'ta paylaş veya fiş olarak indir.",
});

export default function BillSplitterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main id="main-content" className="flex-1" role="main">
        <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:py-12">
          <BillSplitter />
        </div>
      </main>

      <Footer />
    </div>
  );
}

