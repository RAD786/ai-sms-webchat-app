import { MissedCallService } from "@/lib/services/missed-call-service";
import { TwilioService } from "@/lib/services/twilio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[twilio.voice.webhook]";

function buildVoiceTwimlResponse() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    "<Say>Thanks for calling. We will text you shortly.</Say>",
    '<Pause length="1" />',
    "<Hangup />",
    "</Response>"
  ].join("");
}

function xmlResponse(body: string, init?: ResponseInit) {
  return new Response(body, {
    ...init,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      ...init?.headers
    }
  });
}

function textResponse(body: string, init?: ResponseInit) {
  return new Response(body, {
    ...init,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...init?.headers
    }
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  console.info(LOG_PREFIX, "GET health check received", { method: "GET" });

  return textResponse("Twilio voice webhook is live");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "unknown";

    console.info(LOG_PREFIX, "Incoming request received", {
      method: request.method,
      contentType
    });

    const { params } = await TwilioService.parseWebhookRequest(request);
    const payload = TwilioService.toVoicePayload(params);
    const isValid = TwilioService.verifyWebhookSignature(request, params);

    console.info(LOG_PREFIX, "Parsed webhook payload", {
      from: payload.fromPhone,
      to: payload.toPhone,
      callSid: payload.callSid ?? null,
      callStatus: payload.callStatus ?? null,
      signatureValid: isValid
    });

    if (process.env.NODE_ENV === "production" && !isValid) {
      console.warn(LOG_PREFIX, "Rejected request with invalid Twilio signature", {
        callSid: payload.callSid ?? null
      });

      return xmlResponse(TwilioService.buildEmptyTwimlResponse(), {
        status: 403
      });
    }

    const callRecord = await MissedCallService.logIncomingCall(payload);

    console.info(LOG_PREFIX, "Incoming call logged", {
      callSid: payload.callSid ?? null,
      persisted: Boolean(callRecord),
      callRecordId: callRecord?.id ?? null
    });
  } catch (error) {
    console.error(LOG_PREFIX, "Voice webhook processing failed", {
      error: getErrorMessage(error)
    });
  }

  return xmlResponse(buildVoiceTwimlResponse());
}
