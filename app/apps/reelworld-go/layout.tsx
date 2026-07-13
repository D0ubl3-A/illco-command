import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ReelWorld GO — Location-Based AR Fishing",
  description: "Explore mapped water, scan real water with your camera, catch animated fish, visit gas-station bait shops, buy game permits, and avoid ranger citations.",
  applicationName: "ReelWorld GO",
  alternates: {
    canonical: "/apps/reelworld-go",
  },
  openGraph: {
    title: "ReelWorld GO — Location-Based AR Fishing",
    description: "A mobile-first location and camera fishing game inside ILLCO Command.",
    url: "/apps/reelworld-go",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#06111a",
};

export default function ReelWorldLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
