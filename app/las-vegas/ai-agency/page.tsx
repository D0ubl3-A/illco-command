import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";

export const metadata: Metadata = {
  title: "AI Agency Las Vegas | iLLCo AI",
  description: "Las Vegas AI agency services from iLLCo AI: automation, AI apps, creator systems, lead workflows, and managed custom builds.",
  alternates: { canonical: "https://illcoai.tech/las-vegas/ai-agency" },
};

export default function Page() {
  return <LocalServicePage city="Las Vegas" service="AI Agency" headline="A Las Vegas AI agency focused on working systems" intro="iLLCo AI combines AI apps, automation workflows, creator tools, lead systems, and managed custom builds under one public command center with explicit evidence states." bullets={["Business automation and AI-assisted operations.","Lead recovery, intake, and conversion workflows.","Creator, music, video, and app products.","Custom builds with public proof standards and clear status labels."]} related={[{href:"/las-vegas/ai-automation",label:"AI Automation Las Vegas"},{href:"/las-vegas/ai-receptionist",label:"AI Receptionist Las Vegas"},{href:"/henderson/ai-consulting",label:"AI Consulting Henderson"}]} />;
}
