import type { Metadata } from "next";

import { MasterAgentPanel } from "@/components/master-agent-panel";

export const metadata: Metadata = {
  title: "Master Agent",
  description: "Route ILLCO AI buyers, users, and operators to the correct app, tool, account, or setup request.",
  alternates: {
    canonical: "/master-agent",
  },
};

export default function MasterAgentPage() {
  return (
    <main id="main-content" className="fallbackPage masterAgentPage">
      <MasterAgentPanel />
    </main>
  );
}
