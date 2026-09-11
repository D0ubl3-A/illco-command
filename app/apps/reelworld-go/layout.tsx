import type { Metadata, Viewport } from "next";

import "./bobber-overrides.css";
import { ReelWorldVsController } from "./vs-controller";
import { ReelWorldPwaRegister } from "./pwa-register";
import { ReelWorldPlatformFeedback } from "./platform-feedback";
import { ReelWorldVsStorageBridge } from "./vs-storage-bridge";
import { ReelWorldReleaseScope } from "./release-scope";

export const metadata: Metadata = {
  title: "ReelWorld GO — Location-Based AR Fishing",
  description: "Scan visible water with the camera, fish with line, drag, hook, stamina and retrieve mechanics, track catches, and challenge a friend in casual peer-to-peer VS fishing.",
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
      <ReelWorldPwaRegister />
      <ReelWorldPlatformFeedback />
      <ReelWorldVsStorageBridge />
      {children}
      <ReelWorldVsController />
      <ReelWorldReleaseScope />
    </>
  );
}
