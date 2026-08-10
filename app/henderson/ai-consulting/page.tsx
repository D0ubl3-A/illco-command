import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";

export const metadata: Metadata = {
  title: "AI Consulting Henderson NV | iLLCo AI",
  description: "AI consulting and implementation support for Henderson businesses from iLLCo AI, including workflow design, lead systems, automation, and custom builds.",
  alternates: { canonical: "https://illcoai.tech/henderson/ai-consulting" },
};

export default function Page() {
  return <LocalServicePage city="Henderson" service="AI Consulting" headline="AI consulting for Henderson businesses" intro="iLLCo AI helps Henderson businesses identify where AI can reduce repetitive work, improve response time, and support operations, then separates recommendations from systems that have actually been built and verified." bullets={["Workflow and automation opportunity mapping.","Lead-response and intake system design.","AI app and custom-build planning.","Evidence-backed implementation status and public proof standards."]} related={[{href:"/henderson/ai-automation",label:"AI Automation Henderson"},{href:"/las-vegas/ai-agency",label:"AI Agency Las Vegas"},{href:"/las-vegas/ai-receptionist",label:"AI Receptionist Las Vegas"}]} />;
}
