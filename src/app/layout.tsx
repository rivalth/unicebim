import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "./toaster";
import { generateMetadata as generateSeoMetadata } from "@/lib/seo/metadata";
import { generateViewport } from "@/lib/seo/viewport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = generateSeoMetadata();
export const viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
