import {
  Activity,
  Bot,
  Building2,
  MessageCircleReply,
  PhoneMissed,
  Sparkles
} from "lucide-react";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTimestamp(value?: Date | null) {
  if (!value) {
    return "No activity";
  }

  return value.toLocaleString();
}

export default async function DashboardOverviewPage() {
  const { businessId } = await requireBusinessAccess();
  const today = startOfToday();

  const [missedCallsToday, textsSentToday, newLeadsToday, activeLocations, chatbotLeadsToday, recentCalls, recentMessages, recentLeads] =
    await Promise.all([
      prisma.call.count({
        where: {
          businessId,
          status: "MISSED",
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.message.count({
        where: {
          businessId,
          channel: "SMS",
          direction: "OUTBOUND",
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.lead.count({
        where: {
          businessId,
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.location.count({
        where: {
          businessId,
          isActive: true
        }
      }),
      prisma.lead.count({
        where: {
          businessId,
          sourceChannel: "CHAT",
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.call.findMany({
        where: {
          businessId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 4,
        include: {
          lead: true,
          location: true
        }
      }),
      prisma.message.findMany({
        where: {
          businessId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 4,
        include: {
          lead: true,
          location: true
        }
      }),
      prisma.lead.findMany({
        where: {
          businessId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 4
      })
    ]);

  const cards = [
    {
      label: "Missed calls today",
      value: String(missedCallsToday),
      description: "Phone events that can trigger the missed-call SMS workflow.",
      icon: PhoneMissed
    },
    {
      label: "Texts sent today",
      value: String(textsSentToday),
      description: "Outbound SMS volume across all active locations.",
      icon: MessageCircleReply
    },
    {
      label: "New leads today",
      value: String(newLeadsToday),
      description: "Captured across calls, SMS replies, and future web chat.",
      icon: Sparkles
    },
    {
      label: "Active locations",
      value: String(activeLocations),
      description: "Live service locations configured under this tenant.",
      icon: Building2
    },
    {
      label: "Chatbot leads",
      value: String(chatbotLeadsToday),
      description: "Reserved for future web chat lead capture volume.",
      icon: Bot
    }
  ];

  const recentActivity = [
    ...recentCalls.map((call) => ({
      id: `call-${call.id}`,
      title: `${call.status === "MISSED" ? "Missed" : "Answered"} call`,
      detail: `${call.fromPhone} to ${call.location?.name ?? "Unassigned location"}`,
      when: call.createdAt,
      tone: call.status === "MISSED" ? ("warning" as const) : ("success" as const)
    })),
    ...recentMessages.map((message) => ({
      id: `message-${message.id}`,
      title: `${message.direction === "INBOUND" ? "Inbound" : "Outbound"} ${message.channel}`,
      detail: message.body,
      when: message.createdAt,
      tone: "neutral" as const
    })),
    ...recentLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      title: "New lead",
      detail: lead.phone ?? lead.email ?? "Unknown contact",
      when: lead.createdAt,
      tone: "success" as const
    }))
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Shared operating surface for every lead channel"
        description="This dashboard runs on live business data and keeps missed-call SMS and future chatbot capture inside one tenant-bound platform."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Recent activity"
          description="Latest call, message, and lead events across the business."
          icon={Activity}
        >
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No business activity recorded yet.
              </div>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <StatusPill tone={item.tone}>{formatTimestamp(item.when)}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Platform readiness"
          description="Live records confirm the shared schema is serving the current SMS channel and future chatbot channel."
          icon={Sparkles}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
                SMS channel
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
                Active foundation
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Calls, leads, conversations, and messages are flowing through the shared data model.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-sand p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-800">
                Chatbot channel
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-950">
                Placeholder ready
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Chatbot leads and messages can land in the same lead and conversation tables without a second dashboard.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

