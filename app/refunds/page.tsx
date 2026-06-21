import { LegalPage } from "@/components/legal-page";
import { buildLegalMetadata, getLegalPage } from "@/lib/legal-pages";

const page = getLegalPage("refunds");

export const metadata = buildLegalMetadata(page!);

export default function RefundsPage() {
  return <LegalPage page={page!} />;
}
