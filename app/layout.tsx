import type { Metadata, Viewport } from "next";

import { StoreFooter } from "@/components/layout/footer";
import { LeadRecoveryBanner } from "@/components/layout/lead-recovery-banner";
import { StoreNavigation } from "@/components/layout/navigation";
import { BRAND, SITE_URL } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} App Store`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: `${BRAND.name} App Store`,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: `${BRAND.name} App Store`,
    description: BRAND.ogDescription,
    url: SITE_URL,
    siteName: BRAND.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} App Store`,
    description: BRAND.ogDescription,
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
