import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";

export const metadata: Metadata = {
  title: "AI Automation Las Vegas | iLLCo AI",
  description: "AI automation systems for Las Vegas businesses: lead recovery, workflow automation, customer intake, and managed AI builds from iLLCo AI.",
  alternates: { canonical: "https://illcoai.tech/las-vegas/ai-automation" },
};

export default function Page() {
  return <LocalServicePage city="Las Vegas" service="AI Automation" headline="AI automation for Las Vegas businesses" intro="iLLCo AI builds practical automation for businesses that need faster lead response, cleaner intake, repeatable workflows, and AI-assisted operations without pretending an unverified system is production-ready." bullets={["Lead intake and missed-call recovery workflows.","AI-assisted customer qualification and routing.","Repeatable business-process automation and managed builds.","Public proof standards that separate observed, working, verified, and unverified states."]} related={[{href:"/las-vegas/ai-receptionist",label:"AI Receptionist Las Vegas"},{href:"/las-vegas/ai-agency",label:"AI Agency Las Vegas"},{href:"/henderson/ai-consulting",label:"AI Consulting Henderson"}]} />;
}
