import {
  createPhoneNumberAction,
  updateChatbotSettingsAction,
  updatePhoneNumberAction
} from "@/app/dashboard/actions";
import { Bot, Workflow } from "lucide-react";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageHeader } from "@/components/ui/page-header";

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
        missedCallRule: true,
        chatbotSettings: true
      }
    }),
    prisma.phoneNumber.findMany({
      where: {
        businessId
      },
      orderBy: {
        createdAt: "asc"
      },
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Channels"
        title="Feature modules and channel settings"
        description="Edit live SMS channel settings now while keeping chatbot configuration visible as the next module."
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="SMS channel"
          description="Manage active phone numbers and channel switches for missed-call SMS."
          icon={Workflow}
        >
          <div className="mb-4">
            <StatusPill tone="success">Active</StatusPill>
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
                placeholder="Twilio SID"
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
            </form>

            <div className="space-y-4">
              {phoneNumbers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
                  No SMS numbers configured yet.
                </div>
              ) : (
                phoneNumbers.map((phone) => (
                  <form
                    key={phone.id}
                    action={updatePhoneNumberAction}
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 lg:grid-cols-4"
                  >
                    <input type="hidden" name="phoneNumberId" value={phone.id} />
                    <div>
                      <p className="font-semibold text-slate-900">{phone.phoneNumber}</p>
                      <p className="mt-1 text-sm text-slate-600">{phone.location?.name ?? "Business-wide"}</p>
                    </div>
                    <input
                      type="text"
                      name="label"
                      defaultValue={phone.label ?? ""}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="text"
                      name="twilioSid"
                      defaultValue={phone.twilioSid ?? ""}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
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
          </div>
        </SectionCard>

        <SectionCard
          title="Chatbot settings"
          description="Location-level chatbot settings are editable now, while the actual chat widget and AI orchestration remain deferred."
          icon={Bot}
        >
          <div className="mb-4">
            <StatusPill tone="neutral">Placeholder</StatusPill>
          </div>
          <div className="space-y-4">
            {locations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
                No locations available yet. Add a location before configuring chatbot settings.
              </div>
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
                        These settings are stored against the same location and tenant records that SMS already uses. The future widget and chat API can consume them without changing the shared dashboard architecture.
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
      </section>
    </div>
  );
}
