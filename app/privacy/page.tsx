import { LegalPage } from "@/components/legal-page";
import { buildLegalMetadata, getLegalPage } from "@/lib/legal-pages";

const page = getLegalPage("privacy");

export const metadata = buildLegalMetadata(page!);

export default function PrivacyPage() {
  return <LegalPage page={page!} />;
}
