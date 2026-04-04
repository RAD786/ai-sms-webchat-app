export type MissedCallVoiceWebhookPayload = {
  callSid?: string;
  callStatus?: string;
  fromPhone: string;
  toPhone: string;
};

export class MissedCallSmsService {
  static fromVoiceWebhook(formData: FormData): MissedCallVoiceWebhookPayload {
    return {
      callSid: formData.get("CallSid")?.toString(),
      callStatus: formData.get("CallStatus")?.toString(),
      fromPhone: formData.get("From")?.toString() ?? "",
      toPhone: formData.get("To")?.toString() ?? ""
    };
  }

  static buildVoiceWebhookResponse(_payload: MissedCallVoiceWebhookPayload) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }

  static async handleMissedCall(payload: MissedCallVoiceWebhookPayload) {
    void payload;

    // TODO: Orchestrate lead upsert, call persistence, business-hours checks, and SMS follow-up.
    return {
      ok: true,
      status: "scaffolded"
    };
  }
}

