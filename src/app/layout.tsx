import "./globals.css";
import { Toaster } from "./toaster";
import { generateMetadata as generateSeoMetadata } from "@/lib/seo/metadata";
import { generateViewport } from "@/lib/seo/viewport";

export const metadata = generateSeoMetadata();
export const viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
