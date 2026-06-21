import type { Metadata } from "next";

import { IllcoToolsInterface } from "@/components/illco-tools-interface";

export const metadata: Metadata = {
  title: "ILLCO Tools",
  description: "The main ILLCO tools workspace for account access, app routing, proof videos, and shipped systems.",
};

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return <IllcoToolsInterface />;
}
