import twilio from "twilio";
import { env } from "@/lib/env";

export type InboundSmsWebhookPayload = {
  messageSid?: string;
  fromPhone: string;
  toPhone: string;
  body: string;
};

export class SmsService {
  private static getClient() {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      return null;
    }

    return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  static async sendMessage(params: {
    to: string;
    body: string;
    from?: string;
  }) {
    const client = this.getClient();

    if (!client) {
      return {
        queued: false,
        reason: "Twilio credentials are not configured."
      };
    }

    // TODO: Wrap Twilio message sending with persistence and retries.
    return client.messages.create({
      to: params.to,
      body: params.body,
      from: params.from ?? env.TWILIO_PHONE_NUMBER
    });
  }

  static fromInboundWebhook(formData: FormData): InboundSmsWebhookPayload {
    return {
      messageSid: formData.get("MessageSid")?.toString(),
      fromPhone: formData.get("From")?.toString() ?? "",
      toPhone: formData.get("To")?.toString() ?? "",
      body: formData.get("Body")?.toString() ?? ""
    };
  }

  static buildInboundWebhookResponse(_message: InboundSmsWebhookPayload) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }
}

