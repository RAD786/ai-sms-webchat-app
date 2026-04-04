import { LeadStatus } from "@prisma/client";
import { Search, Sparkles } from "lucide-react";
import { updateLeadStatusAction } from "@/app/dashboard/actions";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadsService } from "@/lib/services/leads.service";
import { formatPhoneNumber } from "@/lib/utils/format";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

type LeadsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

function getLeadTone(status: LeadStatus) {
  switch (status) {
    case LeadStatus.BOOKED:
      return "success" as const;
    case LeadStatus.LOST:
      return "danger" as const;
    case LeadStatus.CONTACTED:
    case LeadStatus.QUALIFIED:
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const statusFilter = params.status?.trim() ?? "ALL";
  const { businessId } = await requireBusinessAccess();

  const leads = await prisma.lead.findMany({
    where: {
      ...LeadsService.buildLeadSearchWhere(businessId, query),
      ...(statusFilter !== "ALL"
        ? {
            status: statusFilter as LeadStatus
          }
        : {})
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      location: true,
      _count: {
        select: {
          messages: true,
          calls: true
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Leads"
        title="Unified lead inbox"
        description="Search, filter, and manage leads created by phone, SMS, and future website chat inside one business-scoped pipeline."
      />

      <SectionCard
        title="Lead directory"
        description="Live lead records from the shared data model."
        icon={Sparkles}
      >
        <form method="GET" className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_220px_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name, email, or phone"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="ALL">All statuses</option>
            {Object.values(LeadStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Apply filters
          </button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            <span>Lead</span>
            <span>Source</span>
            <span>Location</span>
            <span>Activity</span>
            <span>Status</span>
          </div>

          {leads.length === 0 ? (
            <div className="bg-white px-4 py-8 text-sm text-slate-600">No leads matched the current filters.</div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-3 border-t border-slate-200 bg-white px-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed lead"}
                  </p>
                  <p className="mt-1 text-slate-600">{formatPhoneNumber(lead.phone) || lead.email || "No contact info"}</p>
                  {lead.smsOptedOut ? (
                    <div className="mt-2">
                      <StatusPill tone="danger">Opted out</StatusPill>
                    </div>
                  ) : null}
                </div>
                <div className="text-slate-600">
                  <p>{lead.sourceChannel ?? "UNKNOWN"}</p>
                  <p className="mt-1">{lead.sourceDescription ?? "Shared pipeline"}</p>
                </div>
                <div className="text-slate-600">{lead.location?.name ?? "Unassigned"}</div>
                <div className="text-slate-600">
                  <p>{lead._count.calls} calls</p>
                  <p className="mt-1">{lead._count.messages} messages</p>
                </div>
                <div className="space-y-2">
                  <StatusPill tone={getLeadTone(lead.status)}>{lead.status}</StatusPill>
                  <form action={updateLeadStatusAction} className="space-y-2">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <select
                      name="status"
                      defaultValue={lead.status}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                    >
                      {Object.values(LeadStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Update
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

