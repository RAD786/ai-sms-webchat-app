import "server-only";

import { prisma } from "@/lib/prisma";
import { ChatbotService } from "@/lib/services/channels/chatbot.service";

export type ChatbotIntakePayload = {
  locationId: string;
  visitorId: string;
  message: string;
};

export class ChatbotIntakeService {
  static async handleIncomingMessage(payload: ChatbotIntakePayload) {
    const location = await prisma.location.findUnique({
      where: {
        id: payload.locationId
      },
      include: {
        chatbotSettings: true
      }
    });

    if (!location) {
      throw new Error("Location not found.");
    }

    if (!location.chatbotSettings?.isEnabled) {
      return {
        accepted: false,
        reason: "chatbot_disabled"
      };
    }

    const message = await ChatbotService.recordInboundVisitorMessage({
      businessId: location.businessId,
      locationId: location.id,
      visitorId: payload.visitorId,
      body: payload.message
    });

    return {
      accepted: true,
      messageId: message.id
    };
  }
}

