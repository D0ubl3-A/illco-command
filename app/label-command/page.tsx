import type { Metadata } from "next";

import { LabelCommandClient } from "./label-command-client";

export const metadata: Metadata = {
  title: "Label Command",
  description:
    "A source-transparent operating workspace for artists, releases, rights, campaigns, analytics, and label decisions.",
  alternates: {
    canonical: "/label-command",
  },
};

export default function LabelCommandPage() {
  return <LabelCommandClient />;
}
