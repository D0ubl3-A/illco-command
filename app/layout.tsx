import type { Metadata, Viewport } from "next";

import { StoreFooter } from "@/components/layout/footer";
import { StoreNavigation } from "@/components/layout/navigation";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://illcoai.tech"),
  title: {
    default: "ILLCO AI App Store",
    template: "%s | ILLCO AI",
  },
  description: "Browse working AI apps, sign in with Google, and open ChatGPT-backed tools from the same storefront.",
  applicationName: "ILLCO AI App Store",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "ILLCO AI App Store",
    description: "Browse working AI apps, sign in with Google, and open ChatGPT-backed tools from the same storefront.",
    url: "https://illcoai.tech",
    siteName: "ILLCO AI App Store",
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "ILLCO AI app store preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ILLCO AI App Store",
    description: "Browse working AI apps, sign in with Google, and open ChatGPT-backed tools from the same storefront.",
    images: ["/media/illco-command-header-loop-poster.jpg"],
  },
  other: {
    "openai-domain-verification": "dv-KKOZCPog7smPE8hZQyGHaOJw",
    "google-site-verification": "AMabPToUKnvo-XeqjVfqUa2OAuE0sJjet1TEdrwSM7I",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skipLink" href="#main-content">Skip to content</a>
        <StoreNavigation />
        {children}
        <StoreFooter />
      </body>
    </html>
  );
}
