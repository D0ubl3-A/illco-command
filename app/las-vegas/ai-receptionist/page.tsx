import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";

export const metadata: Metadata = {
  title: "AI Receptionist Las Vegas | iLLCo AI",
  description: "AI receptionist and lead-response workflows for Las Vegas businesses from iLLCo AI, including intake, qualification, routing, and follow-up.",
  alternates: { canonical: "https://illcoai.tech/las-vegas/ai-receptionist" },
};

export default function Page() {
  return <LocalServicePage city="Las Vegas" service="AI Receptionist" headline="AI receptionist systems for Las Vegas businesses" intro="Use AI-assisted intake, missed-call response, qualification, and handoff workflows to reduce lead leakage while keeping public claims tied to verifiable evidence." bullets={["Missed-call text-back and lead capture.","Structured intake before human handoff.","Qualification and routing workflows.","Clear public status and proof rules for deployed systems."]} related={[{href:"/las-vegas/ai-automation",label:"AI Automation Las Vegas"},{href:"/las-vegas/ai-agency",label:"AI Agency Las Vegas"},{href:"/henderson/ai-consulting",label:"AI Consulting Henderson"}]} />;
}
