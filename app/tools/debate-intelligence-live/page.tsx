import type { Metadata } from "next";
import { DebateIntelligenceLive } from "@/components/debate-intelligence-live";

export const metadata: Metadata = { title: "Live Debate Intelligence", description: "Live microphone transcript and source-backed fact checks in one panel." };
export default function DebateIntelligenceLivePage() { return <DebateIntelligenceLive />; }

