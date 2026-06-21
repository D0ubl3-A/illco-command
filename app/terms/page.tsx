import { LegalPage } from "@/components/legal-page";
import { buildLegalMetadata, getLegalPage } from "@/lib/legal-pages";

const page = getLegalPage("terms");

export const metadata = buildLegalMetadata(page!);

export default function TermsPage() {
  return <LegalPage page={page!} />;
}
