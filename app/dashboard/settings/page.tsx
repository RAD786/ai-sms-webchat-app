import Link from "next/link";
import {
  updateBusinessHoursAction,
  updateBusinessSettingsAction,
  updateLocationAction,
  updateMissedCallRuleAction
} from "@/app/dashboard/actions";
import { BellRing, Building2, CircleCheck, CircleDashed, ExternalLink, Store } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocationSetupService } from "@/lib/services/location-setup.service";
import { formatPhoneNumber } from "@/lib/utils/phone";

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

  const [business, locations] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: {
        id: businessId
      }
    }),
    prisma.location.findMany({
      where: {
        businessId
      },
      orderBy: {
        name: "asc"
      },
      include: {
        phoneNumbers: {
          orderBy: [
            {
              isPrimary: "desc"
            },
            {
              createdAt: "asc"
            }
          ]
        },
        missedCallRule: true,
        businessHours: {
          orderBy: {
            dayOfWeek: "asc"
          }
        }
      }
    })
  ]);

  const setupStates = locations.map((location) => LocationSetupService.getSetupState(location));
  const setupSummary = LocationSetupService.summarize(setupStates);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Business setup and missed-call readiness"
        description="Configure the business profile, location-level routing details, business hours, and missed-call SMS behavior without touching the database."
      />

      <SectionCard
        title="Business profile"
        description="Set the shared tenant details used across the dashboard and as a fallback for scheduling links."
        icon={Store}
      >
        <form action={updateBusinessSettingsAction} className="grid gap-3 lg:grid-cols-2">
          <input
            type="text"
            name="name"
            defaultValue={business.name}
            placeholder="Business name"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            type="text"
            name="websiteUrl"
            defaultValue={business.websiteUrl ?? ""}
            placeholder="https://example.com"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="industry"
            defaultValue={business.industry ?? ""}
            placeholder="Industry"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="timezone"
            defaultValue={business.timezone}
            placeholder="America/New_York"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Save business settings
            </button>
            <p className="text-sm text-slate-600">
              If a location does not have its own booking link, the system falls back to the business website.
            </p>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Setup checklist"
        description="Each location is checked against the minimum records required for calls to route cleanly and missed-call texts to send."
        icon={CircleCheck}
      >
        {locations.length === 0 ? (
          <EmptyState
            title="No locations yet"
            description="Create a location first, then assign a Twilio number, set hours, and add message templates from this dashboard."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">Ready</p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">
                  {setupSummary.readyLocations}/{setupSummary.totalLocations}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Locations with a number, hours, templates, active status, and booking link.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Numbers assigned</p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
                  {setupSummary.locationsWithAssignedNumber}/{setupSummary.totalLocations}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Calls only log against locations whose Twilio number exists in the dashboard.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-sand p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-800">Texting enabled</p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-slate-950">
                  {setupSummary.locationsWithMissedCallTextingEnabled}/{setupSummary.totalLocations}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Requires an assigned SMS-enabled number and missed-call texting turned on.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {setupStates.map((state) => (
                <article key={state.locationId} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                        {state.locationName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {state.assignedPhoneNumber
                          ? `Assigned number: ${formatPhoneNumber(state.assignedPhoneNumber.phoneNumber)}`
                          : "No Twilio number assigned yet"}
                      </p>
                    </div>
                    <StatusPill tone={state.isReady ? "success" : "warning"}>
                      {state.isReady ? "Ready" : `${state.completedCount}/${state.totalCount} complete`}
                    </StatusPill>
                  </div>

                  <div className="mt-4 space-y-3">
                    {state.checklist.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        {item.complete ? (
                          <CircleCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                        ) : (
                          <CircleDashed className="mt-0.5 h-5 w-5 text-amber-600" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.helpText}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {state.alerts.length > 0 ? (
                    <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Why calls may not log or texts may not send</p>
                      <div className="mt-2 space-y-2 text-sm leading-6 text-amber-900">
                        {state.alerts.map((alert) => (
                          <p key={alert}>{alert}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {locations.length === 0 ? (
        <EmptyState
          title="Create a location to start onboarding"
          description="Use the locations page to add your first office, then return here to configure hours and missed-call messaging."
        />
      ) : (
        <div className="space-y-6">
          {locations.map((location, index) => {
            const setupState = setupStates[index];

            return (
              <SectionCard
                key={location.id}
                title={location.name}
                description="Edit this location's profile, hours, and missed-call message templates."
                icon={Building2}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={location.isActive ? "success" : "neutral"}>
                      {location.isActive ? "Active" : "Inactive"}
                    </StatusPill>
                    <StatusPill tone={setupState.isReady ? "success" : "warning"}>
                      {setupState.isReady ? "Setup complete" : "Needs setup"}
                    </StatusPill>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>
                      {setupState.assignedPhoneNumber
                        ? `Live number: ${formatPhoneNumber(setupState.assignedPhoneNumber.phoneNumber)}`
                        : "No live number assigned"}
                    </span>
                    <Link href="/dashboard/channels" className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      Manage Twilio numbers
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <form action={updateLocationAction} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <input type="hidden" name="locationId" value={location.id} />
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">Location profile</h3>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="isActive" defaultChecked={location.isActive} />
                        Active
                      </label>
                    </div>
                    <input
                      type="text"
                      name="name"
                      defaultValue={location.name}
                      placeholder="Location name"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      required
                    />
                    <div className="grid gap-3 lg:grid-cols-2">
                      <input
                        type="text"
                        name="slug"
                        defaultValue={location.slug ?? ""}
                        placeholder="downtown-miami"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        name="timezone"
                        defaultValue={location.timezone}
                        placeholder="America/New_York"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      name="bookingLink"
                      defaultValue={location.bookingLink ?? ""}
                      placeholder="https://example.com/book/location"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <div className="grid gap-3 lg:grid-cols-2">
                      <input
                        type="text"
                        name="addressLine1"
                        defaultValue={location.addressLine1 ?? ""}
                        placeholder="Address line 1"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        name="addressLine2"
                        defaultValue={location.addressLine2 ?? ""}
                        placeholder="Address line 2"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        name="city"
                        defaultValue={location.city ?? ""}
                        placeholder="City"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        name="state"
                        defaultValue={location.state ?? ""}
                        placeholder="State"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        name="postalCode"
                        defaultValue={location.postalCode ?? ""}
                        placeholder="Postal code"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        name="country"
                        defaultValue={location.country}
                        placeholder="US"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      Save a direct booking URL here. The app uses it for the booking keyword reply and setup-readiness checks.
                    </p>
                    <button
                      type="submit"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Save location profile
                    </button>
                  </form>

                  <form action={updateMissedCallRuleAction} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <input type="hidden" name="locationId" value={location.id} />
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">Missed-call SMS rule</h3>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="isEnabled"
                          defaultChecked={location.missedCallRule?.isEnabled ?? true}
                        />
                        Enable missed-call texting
                      </label>
                    </div>
                    <input
                      type="number"
                      name="delaySeconds"
                      min={0}
                      defaultValue={location.missedCallRule?.delaySeconds ?? 90}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <textarea
                      name="autoReplyText"
                      defaultValue={location.missedCallRule?.autoReplyText ?? ""}
                      rows={4}
                      placeholder="Business-hours auto reply text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <p className="text-sm leading-6 text-slate-600">
                      Calls can still log without these templates, but the platform cannot send follow-up texts until the message body is set.
                    </p>
                    <button
                      type="submit"
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Save missed-call rule
                    </button>
                  </form>
                </div>

                <form action={updateBusinessHoursAction} className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                  <input type="hidden" name="locationId" value={location.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">Business hours</h3>
                    <p className="text-sm text-slate-600">
                      The location is treated as closed until at least one open day is saved.
                    </p>
                  </div>
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
              </SectionCard>
            );
          })}
        </div>
      )}

      <SectionCard
        title="Routing notes"
        description="These reminders explain how the live number configuration affects the existing webhook behavior."
        icon={BellRing}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Calls log by destination number</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The webhook maps the inbound Twilio number on the call to a `PhoneNumber` record. If that number is missing or misformatted, the call cannot be attached to a location.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Missed-call texts need two toggles</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The assigned number must have SMS enabled, and the location's missed-call texting rule must also be enabled.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">After-hours behavior depends on saved hours</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If business hours are blank, the platform treats the location as closed and will only use the after-hours template when one is configured.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
