import "./globals.css";
import { Toaster } from "./toaster";
import { generateMetadata as generateSeoMetadata } from "@/lib/seo/metadata";
import { generateViewport } from "@/lib/seo/viewport";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata = generateSeoMetadata();
export const viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
        {children}
        <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
