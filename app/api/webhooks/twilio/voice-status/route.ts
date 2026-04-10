import { MissedCallService } from "@/lib/services/missed-call-service";
import { TwilioService } from "@/lib/services/twilio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[twilio.voice-status.webhook]";

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

  return textResponse("Twilio voice status webhook is live");
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
      callSid: payload.callSid ?? null,
      callStatus: payload.callStatus ?? null,
      from: payload.fromPhone,
      to: payload.toPhone,
      signatureValid: isValid
    });

    if (process.env.NODE_ENV === "production" && !isValid) {
      console.warn(LOG_PREFIX, "Rejected request with invalid Twilio signature", {
        callSid: payload.callSid ?? null,
        callStatus: payload.callStatus ?? null,
        from: payload.fromPhone,
        to: payload.toPhone
      });

      return xmlResponse(TwilioService.buildEmptyTwimlResponse(), {
        status: 403
      });
    }

    const result = await MissedCallService.processCallStatus(payload);

    console.info(LOG_PREFIX, "Call status processed", {
      callSid: payload.callSid ?? null,
      callStatus: payload.callStatus ?? null,
      from: payload.fromPhone,
      to: payload.toPhone,
      automationStatus: result?.automationStatus ?? null,
      automationFired: result?.automationStatus === "sent",
      outboundSmsSucceeded: Boolean(result?.smsSent),
      outboundSmsFailed: result?.automationStatus === "send_failed"
    });
  } catch (error) {
    console.error(LOG_PREFIX, "Voice status webhook processing failed", {
      error: getErrorMessage(error)
    });
  }

  return xmlResponse(TwilioService.buildEmptyTwimlResponse());
}
