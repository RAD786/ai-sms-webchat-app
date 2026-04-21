import Link from "next/link";
import {
  createPhoneNumberAction,
  updateChatbotSettingsAction,
  updatePhoneNumberAction
} from "@/app/dashboard/actions";
import { Bot, Phone, Workflow } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocationSetupService } from "@/lib/services/location-setup.service";
import { formatPhoneNumber } from "@/lib/utils/phone";

export default async function ChannelsPage() {
  const { businessId } = await requireBusinessAccess();

  const [locations, phoneNumbers, chatbotSettings] = await Promise.all([
    prisma.location.findMany({
      where: {
        businessId
      },
      orderBy: {
        name: "asc"
      },
      include: {
        phoneNumbers: true,
        businessHours: true,
        missedCallRule: true,
        chatbotSettings: true
      }
    }),
    prisma.phoneNumber.findMany({
      where: {
        businessId
      },
      orderBy: [
        {
          isPrimary: "desc"
        },
        {
          createdAt: "asc"
        }
      ],
      include: {
        location: true
      }
    }),
    prisma.chatbotSettings.findMany({
      where: {
        location: {
          businessId
        }
      },
      include: {
        location: true
      }
    })
  ]);

  const chatbotSettingsByLocationId = new Map(
    chatbotSettings.map((setting) => [setting.locationId, setting])
  );
  const setupStates = new Map(
    locations.map((location) => [location.id, LocationSetupService.getSetupState(location)])
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Channels"
        title="Phone routing and channel settings"
        description="Save your live Twilio number here, assign it to the correct location, and keep SMS or voice toggles aligned with the working webhook flow."
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="SMS and voice numbers"
          description="Create or update dashboard phone-number records in E.164 format and assign each number to the location that should receive the call context."
          icon={Workflow}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusPill tone="success">Active</StatusPill>
            <p className="text-sm text-slate-600">
              Save US numbers as `+15555555555`. For international numbers, include the leading `+` and country code.
            </p>
          </div>
          <div className="space-y-4">
            <form action={createPhoneNumberAction} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
              <select
                name="locationId"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                defaultValue=""
              >
                <option value="">Business-wide number</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="label"
                placeholder="Label"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
              <input
                type="text"
                name="phoneNumber"
                placeholder="+15555555555"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                required
              />
              <input
                type="text"
                name="twilioSid"
                placeholder="PNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <input type="checkbox" name="smsEnabled" defaultChecked />
                SMS enabled
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <input type="checkbox" name="voiceEnabled" defaultChecked />
                Voice enabled
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <input type="checkbox" name="isPrimary" />
                Primary
              </label>
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add number
              </button>
              <p className="text-sm leading-6 text-slate-600 lg:col-span-2">
                Calls only log when the number Twilio sends in the webhook exactly matches a saved dashboard number after E.164 normalization.
              </p>
            </form>

            <div className="space-y-4">
              {phoneNumbers.length === 0 ? (
                <EmptyState
                  title="No phone numbers configured yet"
                  description="Add the live Twilio number here before expecting calls to log against a location."
                />
              ) : (
                phoneNumbers.map((phone) => (
                  <form
                    key={phone.id}
                    action={updatePhoneNumberAction}
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 lg:grid-cols-4"
                  >
                    <input type="hidden" name="phoneNumberId" value={phone.id} />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="font-semibold text-slate-900">{formatPhoneNumber(phone.phoneNumber)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {phone.location?.name ?? "Business-wide"} - {phone.label ?? "No label"}
                      </p>
                    </div>
                    <input
                      type="text"
                      name="phoneNumber"
                      defaultValue={phone.phoneNumber}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                      required
                    />
                    <select
                      name="locationId"
                      defaultValue={phone.locationId ?? ""}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    >
                      <option value="">Business-wide number</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="label"
                      defaultValue={phone.label ?? ""}
                      placeholder="Label"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="twilioSid"
                      defaultValue={phone.twilioSid ?? ""}
                      placeholder="Twilio SID"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <div className="grid gap-2 sm:grid-cols-3 lg:col-span-2">
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                        <input type="checkbox" name="smsEnabled" defaultChecked={phone.smsEnabled} />
                        SMS
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                        <input type="checkbox" name="voiceEnabled" defaultChecked={phone.voiceEnabled} />
                        Voice
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                        <input type="checkbox" name="isPrimary" defaultChecked={phone.isPrimary} />
                        Primary
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Save number
                    </button>
                  </form>
                ))
              )}
            </div>

            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Admin hints</p>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                <p>If the live Twilio number is not assigned to a location, calls may still hit the webhook but they will not attach to the intended location context.</p>
                <p>If `voiceEnabled` is off, the number remains in the database but is not marked as a live voice-routing line inside the dashboard.</p>
                <p>If `smsEnabled` is off, missed-call texts and keyword replies will not send even if the missed-call rule is enabled.</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Location channel health"
          description="Quickly verify that each location has a live number and a usable texting state."
          icon={Phone}
        >
          {locations.length === 0 ? (
            <EmptyState
              title="No locations available"
              description="Create a location first, then return here to assign a number."
            />
          ) : (
            <div className="space-y-4">
              {locations.map((location) => {
                const setupState = setupStates.get(location.id);

                return (
                  <article key={location.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{location.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {setupState?.assignedPhoneNumber
                            ? formatPhoneNumber(setupState.assignedPhoneNumber.phoneNumber)
                            : "No assigned number"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={setupState?.assignedPhoneNumber ? "success" : "warning"}>
                          {setupState?.assignedPhoneNumber ? "Number assigned" : "Missing number"}
                        </StatusPill>
                        <StatusPill tone={setupState?.missedCallTextingEnabled ? "success" : "warning"}>
                          {setupState?.missedCallTextingEnabled ? "Texting on" : "Texting off"}
                        </StatusPill>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {setupState?.assignedPhoneNumber
                        ? "If calls still do not log, verify the number matches the exact Twilio inbound number and that the Twilio webhook points to the current app environment."
                        : "Assign the live Twilio number to this location before testing call logging or missed-call automations."}
                    </p>
                    <div className="mt-4">
                      <Link href="/dashboard/settings" className="text-sm font-semibold text-slate-900">
                        Review setup checklist
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Chatbot settings"
        description="Location-level chatbot settings remain editable while SMS and voice stay production-critical."
        icon={Bot}
      >
        <div className="mb-4">
          <StatusPill tone="neutral">Placeholder</StatusPill>
        </div>
        <div className="space-y-4">
          {locations.length === 0 ? (
            <EmptyState
              title="No locations available yet"
              description="Add a location before configuring chatbot settings."
            />
          ) : (
            locations.map((location) => {
              const setting =
                chatbotSettingsByLocationId.get(location.id) ?? location.chatbotSettings;

              return (
                <form
                  key={location.id}
                  action={updateChatbotSettingsAction}
                  className="rounded-3xl border border-slate-200 bg-sand p-4"
                >
                  <input type="hidden" name="locationId" value={location.id} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{location.name}</p>
                    <StatusPill tone={setting?.isEnabled ? "success" : "neutral"}>
                      {setting?.isEnabled ? "Configured" : "Disabled"}
                    </StatusPill>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <input type="checkbox" name="isEnabled" defaultChecked={setting?.isEnabled ?? false} />
                      Enable chatbot for this location
                    </label>
                    <input
                      name="welcomeMessage"
                      type="text"
                      defaultValue={setting?.welcomeMessage ?? ""}
                      placeholder="Welcome message"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <input
                      name="primaryColor"
                      type="text"
                      defaultValue={setting?.primaryColor ?? ""}
                      placeholder="#677832"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <textarea
                      name="handoffMessage"
                      defaultValue={setting?.handoffMessage ?? ""}
                      rows={3}
                      placeholder="Handoff message"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <input type="checkbox" name="collectName" defaultChecked={setting?.collectName ?? true} />
                        Collect name
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <input type="checkbox" name="collectPhone" defaultChecked={setting?.collectPhone ?? true} />
                        Collect phone
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                        <input type="checkbox" name="collectEmail" defaultChecked={setting?.collectEmail ?? false} />
                        Collect email
                      </label>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      These settings remain location-scoped so future chat behavior uses the same tenant and location records as the live SMS flow.
                    </p>
                    <button
                      type="submit"
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Save chatbot settings
                    </button>
                  </div>
                </form>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}
