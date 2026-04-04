import { ChatbotIntakeService } from "@/lib/services/channels/chatbot-intake.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        locationId?: string;
        visitorId?: string;
        message?: string;
      }
    | null;

  if (!body?.locationId || !body?.visitorId || !body?.message) {
    return Response.json(
      {
        ok: false,
        error: "locationId, visitorId, and message are required"
      },
      { status: 400 }
    );
  }

  const result = await ChatbotIntakeService.handleIncomingMessage({
    locationId: body.locationId,
    visitorId: body.visitorId,
    message: body.message
  });

  return Response.json({
    ok: true,
    status: "placeholder",
    ...result,
    message: "Chatbot message intake endpoint is scaffolded for future implementation."
  });
}

