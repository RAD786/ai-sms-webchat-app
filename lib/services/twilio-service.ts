import "server-only";

import twilio from "twilio";
import { env } from "@/lib/env";

export type TwilioVoiceWebhookPayload = {
  accountSid?: string;
  callSid?: string;
  callStatus?: string;
  callDuration?: number | null;
  fromPhone: string;
  toPhone: string;
  direction?: string;
  answeredBy?: string;
};

export type TwilioSmsWebhookPayload = {
  accountSid?: string;
  messageSid?: string;
  fromPhone: string;
  toPhone: string;
  body: string;
};

type ParsedWebhookRequest = {
  params: Record<string, string>;
  formData: FormData;
};

export class TwilioService {
  static async parseWebhookRequest(request: Request): Promise<ParsedWebhookRequest> {
    const rawBody = await request.text();
    const searchParams = new URLSearchParams(rawBody);
    const formData = new FormData();
    const params: Record<string, string> = {};

    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
      formData.append(key, value);
    }

    return {
      params,
      formData
    };
  }

  static getWebhookUrl(request: Request) {
    const requestUrl = new URL(request.url);
    const configuredOrigin = env.NEXT_PUBLIC_APP_URL
      ? new URL(env.NEXT_PUBLIC_APP_URL).origin
      : requestUrl.origin;

    return `${configuredOrigin}${requestUrl.pathname}${requestUrl.search}`;
  }

  static verifyWebhookSignature(request: Request, params: Record<string, string>) {
    const authToken = env.TWILIO_AUTH_TOKEN;
    const signature = request.headers.get("x-twilio-signature");

    if (!authToken) {
      return false;
    }

    if (!signature) {
      return false;
    }

    return twilio.validateRequest(authToken, signature, this.getWebhookUrl(request), params);
  }

  static getClient() {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials are not configured.");
    }

    return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  static async sendSms(args: {
    to: string;
    body: string;
    from?: string;
  }) {
    const client = this.getClient();

    return client.messages.create({
      to: args.to,
      body: args.body,
      from: args.from ?? env.TWILIO_PHONE_NUMBER
    });
  }

  static toVoicePayload(params: Record<string, string>): TwilioVoiceWebhookPayload {
    return {
      accountSid: params.AccountSid,
      callSid: params.CallSid,
      callStatus: params.CallStatus,
      callDuration: params.CallDuration ? Number(params.CallDuration) : null,
      fromPhone: params.From ?? "",
      toPhone: params.To ?? "",
      direction: params.Direction,
      answeredBy: params.AnsweredBy
    };
  }

  static toSmsPayload(params: Record<string, string>): TwilioSmsWebhookPayload {
    return {
      accountSid: params.AccountSid,
      messageSid: params.MessageSid,
      fromPhone: params.From ?? "",
      toPhone: params.To ?? "",
      body: params.Body ?? ""
    };
  }

  static buildEmptyTwimlResponse() {
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }

  static buildMessagingResponse(message?: string) {
    if (!message) {
      return this.buildEmptyTwimlResponse();
    }

    const escaped = message
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");

    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
  }
}

