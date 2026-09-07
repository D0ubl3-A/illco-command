import type { Metadata } from "next";
import { LocalServicePage } from "@/components/local-service-page";

export const metadata: Metadata = {
  title: "AI Consulting Las Vegas NV | iLLCo AI",
  description:
    "AI consulting and implementation support for Las Vegas businesses from iLLCo AI, including workflow design, lead systems, automation, and custom builds.",
  alternates: { canonical: "https://illcoai.tech/las-vegas/ai-consulting" },
};

export default function Page() {
  return (
    <LocalServicePage
      city="Las Vegas"
      service="AI Consulting"
      headline="AI consulting for Las Vegas businesses"
      intro="iLLCo AI helps Las Vegas businesses identify where AI can reduce repetitive work, improve response time, and support operations, then separates recommendations from systems that have actually been built and verified."
      bullets={[
        "Workflow and automation opportunity mapping.",
        "Lead-response and intake system design.",
        "AI app and custom-build planning.",
        "Evidence-backed implementation status and public proof standards.",
      ]}
      related={[
        { href: "/las-vegas/ai-agency", label: "AI Agency Las Vegas" },
        { href: "/las-vegas/ai-automation", label: "AI Automation Las Vegas" },
        { href: "/las-vegas/ai-receptionist", label: "AI Receptionist Las Vegas" },
      ]}
    />
  );
}
