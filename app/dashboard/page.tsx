import {
  Activity,
  Bot,
  Building2,
  CircleCheck,
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
import { LocationSetupService } from "@/lib/services/location-setup.service";

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

function getFocusLocationState(states: ReturnType<typeof LocationSetupService.getSetupState>[]) {
  return states.find((state) => !state.isReady) ?? states[0] ?? null;
}

export default async function DashboardOverviewPage() {
  const { businessId } = await requireBusinessAccess();
  const today = startOfToday();

  const [
    missedCallsToday,
    textsSentToday,
    newLeadsToday,
    activeLocations,
    chatbotLeadsToday,
    recentCalls,
    recentMessages,
    recentLeads,
    setupLocations
  ] = await Promise.all([
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
      }),
      prisma.location.findMany({
        where: {
          businessId
        },
        include: {
          phoneNumbers: true,
          businessHours: true,
          missedCallRule: true
        }
      })
    ]);

  const setupStates = setupLocations.map((location) => LocationSetupService.getSetupState(location));
  const setupSummary = LocationSetupService.summarize(setupStates);
  const focusLocationState = getFocusLocationState(setupStates);
  const isBusinessReady =
    setupSummary.totalLocations > 0 && setupSummary.readyLocations === setupSummary.totalLocations;

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

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="System status"
          description="A compact setup check for missed-call SMS readiness."
          icon={CircleCheck}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
                  Business
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {isBusinessReady ? "Configured" : "Needs setup"}
                </p>
              </div>
              <StatusPill tone={isBusinessReady ? "success" : "warning"}>
                {setupSummary.readyLocations}/{setupSummary.totalLocations || 0} ready
              </StatusPill>
            </div>

            {focusLocationState ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Location in focus
                    </p>
                    <p className="mt-2 font-semibold text-slate-950">{focusLocationState.locationName}</p>
                  </div>
                  <StatusPill tone={focusLocationState.isReady ? "success" : "warning"}>
                    {focusLocationState.isReady ? "Configured" : "Incomplete"}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {focusLocationState.alerts[0] ?? "This location is fully configured for missed-call SMS."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Checklist: {focusLocationState.completedCount}/{focusLocationState.totalCount} complete.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                No locations exist yet. Add a location, assign a Twilio number, and save hours plus message templates before testing missed-call SMS.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Setup checklist"
          description="What the platform needs before missed-call SMS is fully live."
          icon={CircleCheck}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Twilio number assigned</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The inbound Twilio number must exist in `PhoneNumber` and be linked to the correct location.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Business hours saved</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                At least one open window is needed so the app can tell business hours from after-hours.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Message templates saved</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Save the missed-call reply text, and the after-hours reply too if after-hours texting is enabled.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Location active and bookable</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The location should be active and have a booking link so keyword replies and setup checks are complete.
              </p>
            </div>
          </div>
        </SectionCard>
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
          description="Live records now show whether each location is actually ready for call logging and missed-call texting."
          icon={CircleCheck}
        >
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
                Live setup
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
                {setupSummary.readyLocations}/{setupSummary.totalLocations || 0} locations ready
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ready means the location is active and has a Twilio number, business hours, message template, and booking link configured.
              </p>
            </div>
            {setupStates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-sand p-4">
                <p className="text-sm leading-6 text-slate-600">
                  No locations exist yet. Add a location before testing the live Twilio number setup.
                </p>
              </div>
            ) : (
              setupStates.slice(0, 3).map((state) => (
                <div key={state.locationId} className="rounded-2xl border border-dashed border-slate-300 bg-sand p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{state.locationName}</p>
                    <StatusPill tone={state.isReady ? "success" : "warning"}>
                      {state.isReady ? "Ready" : `${state.completedCount}/${state.totalCount}`}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {state.alerts[0] ?? "This location is fully configured for live testing."}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Admin hint</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                If a call reaches Twilio but does not appear in the dashboard, the most common cause is that the inbound Twilio number is missing from the phone-number records or assigned to the wrong location.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
