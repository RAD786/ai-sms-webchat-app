import {
  updateBusinessHoursAction,
  updateMissedCallRuleAction
} from "@/app/dashboard/actions";
import { BellRing } from "lucide-react";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

const days = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 }
];

export default async function SettingsPage() {
  const { businessId } = await requireBusinessAccess();

  const locations = await prisma.location.findMany({
    where: {
      businessId
    },
    orderBy: {
      name: "asc"
    },
    include: {
      missedCallRule: true,
      businessHours: {
        orderBy: {
          dayOfWeek: "asc"
        }
      }
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Missed-call rules and business hours"
        description="Manage automation timing and operating hours per location for the current business."
      />

      <div className="space-y-6">
        {locations.map((location) => (
          <SectionCard
            key={location.id}
            title={location.name}
            description="Edit location-specific automation and availability settings."
            icon={BellRing}
          >
            <div className="mb-4">
              <StatusPill tone={location.isActive ? "success" : "neutral"}>
                {location.isActive ? "Active" : "Inactive"}
              </StatusPill>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <form action={updateMissedCallRuleAction} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="locationId" value={location.id} />
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">Missed-call SMS rule</h3>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isEnabled"
                      defaultChecked={location.missedCallRule?.isEnabled ?? true}
                    />
                    Enabled
                  </label>
                </div>
                <input
                  type="number"
                  name="delaySeconds"
                  min={0}
                  defaultValue={location.missedCallRule?.delaySeconds ?? 90}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                />
                <textarea
                  name="autoReplyText"
                  defaultValue={location.missedCallRule?.autoReplyText ?? ""}
                  rows={4}
                  placeholder="Auto reply text during business hours"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="sendAfterHoursReply"
                    defaultChecked={location.missedCallRule?.sendAfterHoursReply ?? true}
                  />
                  Send after-hours reply
                </label>
                <textarea
                  name="afterHoursReplyText"
                  defaultValue={location.missedCallRule?.afterHoursReplyText ?? ""}
                  rows={4}
                  placeholder="After-hours reply text"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Save missed-call rule
                </button>
              </form>

              <form action={updateBusinessHoursAction} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                <input type="hidden" name="locationId" value={location.id} />
                <h3 className="font-semibold text-slate-900">Business hours</h3>
                <div className="space-y-3">
                  {days.map((day) => {
                    const entry = location.businessHours.find((hour) => hour.dayOfWeek === day.value);

                    return (
                      <div
                        key={day.value}
                        className="grid items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:grid-cols-[120px_1fr_1fr_100px]"
                      >
                        <p className="text-sm font-medium text-slate-900">{day.label}</p>
                        <input
                          type="time"
                          name={`opensAt-${day.value}`}
                          defaultValue={entry?.opensAt ?? ""}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        />
                        <input
                          type="time"
                          name={`closesAt-${day.value}`}
                          defaultValue={entry?.closesAt ?? ""}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            name={`isClosed-${day.value}`}
                            defaultChecked={entry?.isClosed ?? day.value === 0}
                          />
                          Closed
                        </label>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="submit"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Save business hours
                </button>
              </form>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
