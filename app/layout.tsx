import type { Metadata, Viewport } from "next";

import { GlobalAuthHeader } from "@/components/global-auth-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://illcoai.tech"),
  title: {
    default: "ILLCO AI Tools Marketplace",
    template: "%s | ILLCO AI",
  },
  description:
    "Buy working AI tools, watch proof videos, or request custom AI systems for lead recovery, content, email, and operations.",
  applicationName: "ILLCO AI",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "ILLCO AI Tools Marketplace",
    description:
      "Buy working AI tools, watch proof videos, or request custom AI systems for lead recovery, content, email, and operations.",
    url: "https://illcoai.tech",
    siteName: "ILLCO AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ILLCO AI Tools Marketplace",
    description:
      "Buy working AI tools, watch proof videos, or request custom AI systems for lead recovery, content, email, and operations.",
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
        <GlobalAuthHeader />
        {children}
        <footer className="siteFooter" aria-label="Site footer">
          <div>
            <strong>ILLCO AI</strong>
            <span>Working AI tools, subscriptions, and custom automation systems.</span>
          </div>
          <nav aria-label="Legal and support links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refunds">Refunds</a>
            <a href="/accessibility">Accessibility</a>
            <a href="/cookies">Cookies</a>
            <a href="mailto:admin@illcoai.tech">Contact</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
