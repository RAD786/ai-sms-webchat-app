import { PhoneCall } from "lucide-react";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/utils/format";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

type CallsPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

function getCallTone(status: string) {
  if (status === "MISSED") return "warning" as const;
  if (status === "ANSWERED") return "success" as const;
  return "neutral" as const;
}

export default async function CallsPage({ searchParams }: CallsPageProps) {
  const params = (await searchParams) ?? {};
  const statusFilter = params.status?.trim() ?? "ALL";
  const { businessId } = await requireBusinessAccess();

  const calls = await prisma.call.findMany({
    where: {
      businessId,
      ...(statusFilter !== "ALL"
        ? {
            status: statusFilter as "MISSED" | "ANSWERED"
          }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      lead: true,
      location: true,
      phoneNumber: true
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calls"
        title="Inbound call activity"
        description="Review answered and missed calls, linked leads, and automated SMS outcomes from one shared phone event timeline."
      />

      <SectionCard
        title="Call timeline"
        description="Missed and answered calls for the current business."
        icon={PhoneCall}
      >
        <form method="GET" className="mb-6 flex flex-wrap gap-3">
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="ALL">All calls</option>
            <option value="MISSED">Missed only</option>
            <option value="ANSWERED">Answered only</option>
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Apply
          </button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            <span>Caller</span>
            <span>Location</span>
            <span>Lead</span>
            <span>Status</span>
            <span>SMS sent</span>
            <span>Time</span>
          </div>
          {calls.length === 0 ? (
            <div className="bg-white px-4 py-8 text-sm text-slate-600">No calls found for this filter.</div>
          ) : (
            calls.map((call) => (
              <div
                key={call.id}
                className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-t border-slate-200 bg-white px-4 py-4 text-sm"
              >
                <div className="text-slate-900">
                  <p className="font-semibold">{formatPhoneNumber(call.fromPhone)}</p>
                  <p className="mt-1 text-slate-500">To {formatPhoneNumber(call.toPhone)}</p>
                </div>
                <div className="text-slate-600">{call.location?.name ?? "Unassigned"}</div>
                <div className="text-slate-600">
                  {[call.lead?.firstName, call.lead?.lastName].filter(Boolean).join(" ") || call.lead?.phone || "No lead"}
                </div>
                <div>
                  <StatusPill tone={getCallTone(call.status)}>{call.status}</StatusPill>
                </div>
                <div className="text-slate-600">
                  {call.smsSent ? (
                    <StatusPill tone="success">Sent</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">No</StatusPill>
                  )}
                </div>
                <div className="text-slate-600">{call.createdAt.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

