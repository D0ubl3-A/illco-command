import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";

export const metadata: Metadata = {
  title: "AI Automation Henderson NV | iLLCo AI",
  description: "AI automation for Henderson businesses from iLLCo AI: intake, lead response, workflow automation, and managed custom systems.",
  alternates: { canonical: "https://illcoai.tech/henderson/ai-automation" },
};

export default function Page() {
  return <LocalServicePage city="Henderson" service="AI Automation" headline="AI automation for Henderson businesses" intro="iLLCo AI builds practical automation for Henderson businesses, with clear separation between recommendations, working interfaces, and systems backed by current verification evidence." bullets={["Lead capture and response workflows.","Customer intake and routing automation.","Repeatable operational workflows.","Managed custom builds with explicit verification states."]} related={[{href:"/henderson/ai-consulting",label:"AI Consulting Henderson"},{href:"/las-vegas/ai-automation",label:"AI Automation Las Vegas"},{href:"/las-vegas/ai-agency",label:"AI Agency Las Vegas"}]} />;
}
