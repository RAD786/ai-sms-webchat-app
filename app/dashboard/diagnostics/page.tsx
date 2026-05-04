import { AlertTriangle, Bug, MessageSquareWarning, PhoneForwarded, RadioTower } from "lucide-react";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/utils/phone";

function getTone(level: string) {
  if (level === "error") {
    return "danger" as const;
  }

  if (level === "warning") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function formatValue(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  if (value.startsWith("+")) {
    return formatPhoneNumber(value);
  }

  return value;
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return null;
  }
}

type EventListProps = {
  emptyTitle: string;
  emptyDescription: string;
  events: Array<{
    id: string;
    message: string;
    level: string;
    eventType: string;
    fromPhone: string | null;
    toPhone: string | null;
    providerCallId: string | null;
    providerMessageId: string | null;
    createdAt: Date;
    metadata: unknown;
    location?: {
      name: string;
    } | null;
    business?: {
      name: string;
    } | null;
  }>;
};

function EventList({ emptyTitle, emptyDescription, events }: EventListProps) {
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const metadataText = formatMetadata(event.metadata);

        return (
          <article key={event.id} className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{event.message}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {event.location?.name ?? event.business?.name ?? "Platform-level event"} - {event.eventType}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={getTone(event.level)}>{event.level}</StatusPill>
                <StatusPill tone="neutral">{event.createdAt.toLocaleString()}</StatusPill>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">From:</span> {formatValue(event.fromPhone)}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-900">To:</span> {formatValue(event.toPhone)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Call SID:</span>{" "}
                  {event.providerCallId ?? "None"}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-slate-900">Message SID:</span>{" "}
                  {event.providerMessageId ?? "None"}
                </p>
              </div>
            </div>

            {metadataText ? (
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                {metadataText}
              </pre>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default async function DiagnosticsPage() {
  const { businessId, role } = await requireBusinessAccess();

  if (!([UserRole.OWNER, UserRole.ADMIN] as UserRole[]).includes(role)) {
    redirect("/dashboard");
  }

  const [webhookEvents, callEvents, smsEvents, unmatchedPhoneEvents, failedMessageEvents] =
    await Promise.all([
      prisma.diagnosticEvent.findMany({
        where: {
          category: {
            in: ["webhook_voice", "webhook_sms"]
          },
          OR: [{ businessId }, { businessId: null }]
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          location: {
            select: {
              name: true
            }
          },
          business: {
            select: {
              name: true
            }
          }
        },
        take: 12
      }),
      prisma.diagnosticEvent.findMany({
        where: {
          businessId,
          category: "call_processing"
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          location: {
            select: {
              name: true
            }
          },
          business: {
            select: {
              name: true
            }
          }
        },
        take: 12
      }),
      prisma.diagnosticEvent.findMany({
        where: {
          businessId,
          category: "sms_processing"
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          location: {
            select: {
              name: true
            }
          },
          business: {
            select: {
              name: true
            }
          }
        },
        take: 12
      }),
      prisma.diagnosticEvent.findMany({
        where: {
          eventType: {
            in: ["phone_number_unmatched", "sms_unmatched_phone_number"]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          location: {
            select: {
              name: true
            }
          },
          business: {
            select: {
              name: true
            }
          }
        },
        take: 10
      }),
      prisma.diagnosticEvent.findMany({
        where: {
          OR: [
            {
              businessId,
              eventType: {
                in: ["outbound_sms_failed", "missed_call_sms_failed", "sms_reply_failed"]
              }
            },
            {
              businessId,
              level: "error",
              category: "sms_processing"
            }
          ]
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          location: {
            select: {
              name: true
            }
          },
          business: {
            select: {
              name: true
            }
          }
        },
        take: 10
      })
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Diagnostics"
        title="Webhook and automation diagnostics"
        description="A lightweight support surface for checking recent Twilio webhook traffic, call processing outcomes, SMS automation behavior, unmatched numbers, and send failures."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Webhook events</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
            {webhookEvents.length}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Call results</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
            {callEvents.length}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SMS results</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
            {smsEvents.length}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Unmatched numbers</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
            {unmatchedPhoneEvents.length}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Send failures</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
            {failedMessageEvents.length}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Recent webhook events"
          description="Latest voice and SMS webhook receipts, rejections, and failures."
          icon={RadioTower}
        >
          <EventList
            events={webhookEvents}
            emptyTitle="No webhook events yet"
            emptyDescription="Once Twilio hits the voice or SMS endpoints, the latest webhook receipts and failures will show here."
          />
        </SectionCard>

        <SectionCard
          title="Recent call processing results"
          description="Missed-call automation outcomes, skips, and call-record persistence events."
          icon={PhoneForwarded}
        >
          <EventList
            events={callEvents}
            emptyTitle="No call processing results yet"
            emptyDescription="When voice webhooks create or update call records, the resulting processing events will show here."
          />
        </SectionCard>

        <SectionCard
          title="Recent SMS processing results"
          description="Inbound SMS processing, keyword replies, duplicate handling, and reply outcomes."
          icon={Bug}
        >
          <EventList
            events={smsEvents}
            emptyTitle="No SMS processing results yet"
            emptyDescription="When inbound SMS messages arrive, the app will log reply decisions and failures here."
          />
        </SectionCard>

        <SectionCard
          title="Unmatched phone numbers"
          description="Recent webhook traffic that used a phone number the platform could not match to a configured Twilio line."
          icon={AlertTriangle}
        >
          <EventList
            events={unmatchedPhoneEvents}
            emptyTitle="No unmatched numbers"
            emptyDescription="If all inbound numbers are configured correctly, this section stays quiet."
          />
        </SectionCard>
      </section>

      <SectionCard
        title="Failed message sends"
        description="Recent outbound SMS send failures and reply failures for the current business."
        icon={MessageSquareWarning}
      >
        <EventList
          events={failedMessageEvents}
          emptyTitle="No failed sends recorded"
          emptyDescription="Outbound send failures will appear here with the phone numbers, provider IDs, and raw error details."
        />
      </SectionCard>
    </div>
  );
}
