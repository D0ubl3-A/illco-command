import type { Metadata, Viewport } from "next";

import "./bobber-overrides.css";
import { WaterDetectionUpgrade } from "./water-detection-upgrade";
import { ReelWorldVsController } from "./vs-controller";

export const metadata: Metadata = {
  title: "ReelWorld GO — Location-Based AR Fishing",
  description: "Explore mapped water, scan real water with your camera, catch animated fish, challenge a friend in live VS fishing, visit gas-station bait shops, buy game permits, and avoid ranger citations.",
  applicationName: "ReelWorld GO",
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
  return (
    <>
      <WaterDetectionUpgrade />
      {children}
      <ReelWorldVsController />
    </>
  );
}
