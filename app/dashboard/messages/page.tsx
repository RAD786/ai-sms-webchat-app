import { MessageSquareText } from "lucide-react";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/utils/format";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

function getDirectionTone(direction: string) {
  return direction === "INBOUND" ? ("warning" as const) : ("success" as const);
}

export default async function MessagesPage() {
  const { businessId } = await requireBusinessAccess();

  const conversations = await prisma.conversation.findMany({
    where: {
      businessId
    },
    orderBy: {
      lastMessageAt: "desc"
    },
    include: {
      lead: true,
      location: true,
      messages: {
        orderBy: {
          createdAt: "desc"
        },
        take: 5
      }
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Messages"
        title="Conversation history"
        description="Shared conversations group inbound and outbound messages for SMS today and future chat tomorrow."
      />

      <SectionCard
        title="Conversation groups"
        description="Recent conversations across the business."
        icon={MessageSquareText}
      >
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              No conversations found yet.
            </div>
          ) : (
            conversations.map((conversation) => (
              <article key={conversation.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {[conversation.lead?.firstName, conversation.lead?.lastName].filter(Boolean).join(" ") ||
                        formatPhoneNumber(conversation.lead?.phone) ||
                        "Unknown contact"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {conversation.location?.name ?? "Unassigned"} · {conversation.channel}
                    </p>
                  </div>
                  <StatusPill tone="neutral">
                    {conversation.lastMessageAt?.toLocaleString() ?? "No messages"}
                  </StatusPill>
                </div>

                <div className="mt-4 space-y-3">
                  {conversation.messages.map((message) => (
                    <div key={message.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <StatusPill tone={getDirectionTone(message.direction)}>{message.direction}</StatusPill>
                        <p className="text-xs text-slate-500">{message.createdAt.toLocaleString()}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
