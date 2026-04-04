import { Building2, MapPin } from "lucide-react";
import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction
} from "@/app/dashboard/actions";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

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
      phoneNumbers: true,
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
        eyebrow="Locations"
        title="Manage service locations"
        description="Create, update, and remove business locations while keeping access scoped to the current tenant."
      />

      <SectionCard
        title="Create location"
        description="Add a new service location to the shared platform."
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
            name="addressLine1"
            placeholder="Address line 1"
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
        </form>
      </SectionCard>

      <SectionCard
        title="Location directory"
        description="Edit live tenant locations and view linked phone numbers."
        icon={MapPin}
      >
        <div className="space-y-4">
          {locations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              No locations created yet.
            </div>
          ) : (
            locations.map((location) => (
              <article key={location.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-950">
                      {location.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {location.city || "No city"}, {location.state || "No state"} · {location.timezone}
                    </p>
                  </div>
                  <StatusPill tone={location.isActive ? "success" : "neutral"}>
                    {location.isActive ? "Active" : "Inactive"}
                  </StatusPill>
                </div>

                <form action={updateLocationAction} className="grid gap-3 lg:grid-cols-3">
                  <input type="hidden" name="locationId" value={location.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={location.name}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
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
                    name="addressLine1"
                    defaultValue={location.addressLine1 ?? ""}
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

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span>{location.phoneNumbers.length} phone numbers</span>
                  <span>{location.businessHours.length} hours entries</span>
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
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

