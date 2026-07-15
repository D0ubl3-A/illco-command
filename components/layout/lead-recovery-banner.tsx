import Link from "next/link";
import { ArrowRight, PhoneMissed } from "lucide-react";

export function LeadRecoveryBanner() {
  return (
    <div className="border-b border-emerald-300/20 bg-emerald-300/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-start gap-3 text-sm text-emerald-50">
          <PhoneMissed className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          <span>
            <strong>New: ILLCO Lead Recovery System.</strong> Turn missed calls into booked customers — three founding-client installations at $750 setup plus $199 monthly.
          </span>
        </div>
        <Link
          href="/lead-rescue"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-white"
        >
          See the offer
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
