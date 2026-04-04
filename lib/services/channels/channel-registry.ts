import { ChannelType } from "@/types/domain";

export const channelRegistry = [
  {
    key: "missed-call-sms",
    name: "Missed-call SMS",
    type: ChannelType.MISSED_CALL_SMS,
    status: "ready for implementation",
    description:
      "Handles Twilio voice webhooks, lead lookup or creation, business-hours checks, and outbound SMS follow-up flows.",
    configureHint:
      "Configure business-level defaults, location mappings, phone numbers, and message templates here."
  },
  {
    key: "website-chatbot",
    name: "Website chatbot popup",
    type: ChannelType.WEBSITE_CHATBOT,
    status: "placeholder",
    description:
      "Reserved for future web lead capture, transcript storage, routing rules, and conversion workflows.",
    configureHint:
      "Future chatbot settings will live here without changing the shared dashboard or core models."
  }
] as const;

