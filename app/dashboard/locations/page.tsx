import Link from "next/link";
import { Building2, MapPin, SquarePen } from "lucide-react";
import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction
} from "@/app/dashboard/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocationSetupService } from "@/lib/services/location-setup.service";
import { formatPhoneNumber } from "@/lib/utils/phone";

export default async function LocationsPage() {
  const { businessId } = await requireBusinessAccess();

  const locations = await prisma.location.findMany({
    where: {
      businessId
    },
    orderBy: {
      createdAt: "asc"
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
      businessHours: {
        orderBy: {
          dayOfWeek: "asc"
        }
      },
      missedCallRule: true
    }
  });

  const setupStates = new Map(
    locations.map((location) => [location.id, LocationSetupService.getSetupState(location)])
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Locations"
        title="Manage service locations"
        description="Create and maintain the live locations that own phone routing, business hours, templates, and booking links."
      />

      <SectionCard
        title="Create location"
        description="Add a new service location so it can be assigned a Twilio number and onboarded through the setup dashboard."
        icon={Building2}
      >
        <form action={createLocationAction} className="grid gap-3 lg:grid-cols-3">
          <input
            type="text"
            name="name"
            placeholder="Location name"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            required
          />
          <input
            type="text"
            name="slug"
            placeholder="Slug (optional)"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="timezone"
            defaultValue="America/New_York"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="bookingLink"
            placeholder="https://example.com/book/location"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="addressLine1"
            placeholder="Address line 1"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="addressLine2"
            placeholder="Address line 2"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="postalCode"
            placeholder="Postal code"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="text"
            name="country"
            defaultValue="US"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add location
          </button>
          <p className="flex items-center text-sm text-slate-600 lg:col-span-2">
            Save the direct scheduling URL here if this office has its own booking page.
          </p>
        </form>
      </SectionCard>

      <SectionCard
        title="Location directory"
        description="Edit location records and see whether each location is fully ready for live call logging and missed-call texting."
        icon={MapPin}
      >
        <div className="space-y-4">
          {locations.length === 0 ? (
            <EmptyState
              title="No locations created yet"
              description="Create your first location above, then assign its live Twilio number from the channels page."
            />
          ) : (
            locations.map((location) => {
              const setupState = setupStates.get(location.id);

              return (
                <article key={location.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                        {location.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {[location.city, location.state].filter(Boolean).join(", ") || "No city/state saved"} -{" "}
                        {location.timezone}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={location.isActive ? "success" : "neutral"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </StatusPill>
                      <StatusPill tone={setupState?.isReady ? "success" : "warning"}>
                        {setupState?.isReady ? "Ready" : "Needs setup"}
                      </StatusPill>
                    </div>
                  </div>

                  <form action={updateLocationAction} className="grid gap-3 lg:grid-cols-3">
                    <input type="hidden" name="locationId" value={location.id} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={location.name}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      required
                    />
                    <input
                      type="text"
                      name="slug"
                      defaultValue={location.slug ?? ""}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="timezone"
                      defaultValue={location.timezone}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="bookingLink"
                      defaultValue={location.bookingLink ?? ""}
                      placeholder="https://example.com/book/location"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="addressLine1"
                      defaultValue={location.addressLine1 ?? ""}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="addressLine2"
                      defaultValue={location.addressLine2 ?? ""}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="city"
                      defaultValue={location.city ?? ""}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="state"
                      defaultValue={location.state ?? ""}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="postalCode"
                      defaultValue={location.postalCode ?? ""}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="country"
                      defaultValue={location.country}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <input type="checkbox" name="isActive" defaultChecked={location.isActive} />
                      Active location
                    </label>
                    <button
                      type="submit"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Save changes
                    </button>
                  </form>

                  <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Readiness snapshot</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span>
                          {setupState?.assignedPhoneNumber
                            ? `Number: ${formatPhoneNumber(setupState.assignedPhoneNumber.phoneNumber)}`
                            : "No number assigned"}
                        </span>
                        <span>{location.businessHours.length} saved hours rows</span>
                        <span>{location.bookingLink ? "Booking link saved" : "No booking link"}</span>
                      </div>
                      {setupState?.alerts.length ? (
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                          {setupState.alerts.slice(0, 2).map((alert) => (
                            <p key={alert}>{alert}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          This location has the minimum setup records needed for live use.
                        </p>
                      )}
                    </div>

                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Next setup step</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {setupState?.assignedPhoneNumber
                          ? "Fine-tune hours and templates from the settings page."
                          : "Assign the live Twilio number from the channels page so inbound calls can be matched to this location."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href="/dashboard/channels"
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <SquarePen className="h-4 w-4" />
                          Manage numbers
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <SquarePen className="h-4 w-4" />
                          Configure hours and texts
                        </Link>
                      </div>
                    </div>
                  </div>

                  <form action={deleteLocationAction} className="mt-4">
                    <input type="hidden" name="locationId" value={location.id} />
                    <button
                      type="submit"
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete location
                    </button>
                  </form>
                </article>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}
