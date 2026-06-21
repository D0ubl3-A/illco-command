import type { Metadata } from "next";

import { ShaylaFeedbackClient } from "@/components/shayla-feedback-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shayla Feedback Watcher",
  description: "Five-minute creative feedback watcher for Shayla video and product visual notes.",
};

export default function ShaylaFeedbackPage() {
  return <ShaylaFeedbackClient />;
}
