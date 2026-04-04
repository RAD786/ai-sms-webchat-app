import { ChatbotService } from "@/lib/services/channels/chatbot.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        businessId?: string;
        locationId?: string;
        visitorId?: string;
      }
    | null;

  if (!body?.businessId || !body?.visitorId) {
    return Response.json(
      {
        ok: false,
        error: "businessId and visitorId are required"
      },
      { status: 400 }
    );
  }

  const conversation = await ChatbotService.findOrCreateVisitorConversation({
    businessId: body.businessId,
    locationId: body.locationId ?? null,
    visitorId: body.visitorId
  });

  return Response.json({
    ok: true,
    status: "placeholder",
    conversationId: conversation.id,
    message: "Chatbot session endpoint reserved for future website widget integration."
  });
}

