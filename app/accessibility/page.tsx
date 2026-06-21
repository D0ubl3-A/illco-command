import { LegalPage } from "@/components/legal-page";
import { buildLegalMetadata, getLegalPage } from "@/lib/legal-pages";

const page = getLegalPage("accessibility");

export const metadata = buildLegalMetadata(page!);

export default function AccessibilityPage() {
  return <LegalPage page={page!} />;
}
