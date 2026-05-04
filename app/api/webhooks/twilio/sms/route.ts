import { MissedCallService } from "@/lib/services/missed-call-service";
import { DiagnosticsService } from "@/lib/services/diagnostics.service";
import { TwilioService } from "@/lib/services/twilio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[twilio.sms.webhook]";

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

  return textResponse("Twilio SMS webhook is live");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "unknown";

    console.info(LOG_PREFIX, "Incoming request received", {
      method: request.method,
      contentType
    });

    const { params } = await TwilioService.parseWebhookRequest(request);
    const payload = TwilioService.toSmsPayload(params);
    const isValid = TwilioService.verifyWebhookSignature(request, params);

    console.info(LOG_PREFIX, "Parsed webhook payload", {
      from: payload.fromPhone,
      to: payload.toPhone,
      body: payload.body,
      messageSid: payload.messageSid ?? null,
      signatureValid: isValid
    });

    await DiagnosticsService.record({
      category: "webhook_sms",
      eventType: "sms_webhook_received",
      level: "info",
      message: "Received incoming SMS webhook",
      fromPhone: payload.fromPhone,
      toPhone: payload.toPhone,
      providerMessageId: payload.messageSid ?? null,
      metadata: {
        signatureValid: isValid,
        bodyLength: payload.body.length,
        contentType
      }
    });

    if (process.env.NODE_ENV === "production" && !isValid) {
      console.warn(LOG_PREFIX, "Rejected request with invalid Twilio signature", {
        messageSid: payload.messageSid ?? null
      });

      await DiagnosticsService.record({
        category: "webhook_sms",
        eventType: "sms_webhook_rejected",
        level: "warning",
        message: "Rejected SMS webhook because the Twilio signature was invalid",
        fromPhone: payload.fromPhone,
        toPhone: payload.toPhone,
        providerMessageId: payload.messageSid ?? null,
        metadata: {
          reason: "invalid_signature"
        }
      });

      return xmlResponse(TwilioService.buildEmptyTwimlResponse(), {
        status: 403
      });
    }

    const result = await MissedCallService.processInboundSmsReply(payload);

    console.info(LOG_PREFIX, "Inbound SMS processed", result);
  } catch (error) {
    await DiagnosticsService.record({
      category: "webhook_sms",
      eventType: "sms_webhook_failed",
      level: "error",
      message: "SMS webhook processing failed",
      metadata: {
        error: getErrorMessage(error)
      }
    });

    console.error(LOG_PREFIX, "SMS webhook processing failed", {
      error: getErrorMessage(error)
    });
  }

  return xmlResponse(TwilioService.buildEmptyTwimlResponse());
}
