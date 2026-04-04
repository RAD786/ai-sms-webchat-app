import { MissedCallService } from "@/lib/services/missed-call-service";
import { TwilioService } from "@/lib/services/twilio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { params } = await TwilioService.parseWebhookRequest(request);
  const isValid = TwilioService.verifyWebhookSignature(request, params);

  if (process.env.NODE_ENV === "production" && !isValid) {
    return new Response(TwilioService.buildEmptyTwimlResponse(), {
      status: 403,
      headers: {
        "Content-Type": "text/xml"
      }
    });
  }

  const payload = TwilioService.toVoicePayload(params);

  void MissedCallService.processCallStatus(payload).catch((error) => {
    console.error("Status webhook processing failed", error);
  });

  return new Response(TwilioService.buildEmptyTwimlResponse(), {
    headers: {
      "Content-Type": "text/xml"
    }
  });
}
