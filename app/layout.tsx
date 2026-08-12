import type { Metadata, Viewport } from "next";

import { StoreFooter } from "@/components/layout/footer";
import { LeadRecoveryBanner } from "@/components/layout/lead-recovery-banner";
import { StoreNavigation } from "@/components/layout/navigation";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://illcoai.tech"),
  title: {
    default: "iLLCo AI App Store",
    template: "%s | iLLCo AI",
  },
  description: "iLLCo AI builds working AI apps, business automation systems, creator tools, lead workflows, and managed custom builds from its public command center.",
  applicationName: "iLLCo AI App Store",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "iLLCo AI App Store",
    description: "Working AI apps, business automation systems, creator tools, lead workflows, and managed custom builds.",
    url: "https://illcoai.tech",
    siteName: "iLLCo AI",
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "iLLCo AI app store preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "iLLCo AI App Store",
    description: "Working AI apps, automation systems, creator tools, lead workflows, and managed builds.",
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
  themeColor: "#050a12",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skipLink" href="#main-content">Skip to content</a>
        <StoreNavigation />
        <LeadRecoveryBanner />
        {children}
        <StoreFooter />
      </body>
    </html>
  );
}
