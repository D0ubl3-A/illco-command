import { LegalPage } from "@/components/legal-page";
import { buildLegalMetadata, getLegalPage } from "@/lib/legal-pages";

const page = getLegalPage("cookies");

export const metadata = buildLegalMetadata(page!);

export default function CookiesPage() {
  return <LegalPage page={page!} />;
}
