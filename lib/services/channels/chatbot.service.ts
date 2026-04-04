import "server-only";

import { ConversationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MessagesService } from "@/lib/services/messages.service";

export type ChatbotSessionInput = {
  businessId: string;
  locationId?: string | null;
  visitorId: string;
  subject?: string;
};

export type ChatbotMessageInput = {
  businessId: string;
  locationId?: string | null;
  conversationId?: string | null;
  leadId?: string | null;
  visitorId: string;
  body: string;
};

export class ChatbotService {
  static async getLocationSettings(locationId: string) {
    return prisma.chatbotSettings.findUnique({
      where: {
        locationId
      }
    });
  }

  static async findOrCreateVisitorConversation(input: ChatbotSessionInput) {
    return MessagesService.findOrCreateConversation({
      businessId: input.businessId,
      locationId: input.locationId ?? null,
      channel: ConversationChannel.CHAT,
      subject: input.subject ?? "Website chat conversation",
      externalThreadId: `chat:${input.locationId ?? "business"}:${input.visitorId}`,
      metadata: {
        visitorId: input.visitorId,
        channelReadiness: "placeholder"
      }
    });
  }

  static async recordInboundVisitorMessage(input: ChatbotMessageInput) {
    const conversation =
      input.conversationId != null
        ? await MessagesService.getConversation(input.businessId, input.conversationId)
        : await this.findOrCreateVisitorConversation({
            businessId: input.businessId,
            locationId: input.locationId,
            visitorId: input.visitorId
          });

    if (!conversation) {
      throw new Error("Chatbot conversation could not be created.");
    }

    return MessagesService.recordInboundMessage({
      businessId: input.businessId,
      locationId: input.locationId ?? conversation.locationId,
      leadId: input.leadId ?? conversation.leadId,
      conversationId: conversation.id,
      channel: ConversationChannel.CHAT,
      body: input.body,
      fromAddress: input.visitorId,
      toAddress: "website-chatbot",
      metadata: {
        source: "website_chat_placeholder"
      },
      conversationMetadata: {
        visitorId: input.visitorId,
        latestChannel: "CHAT"
      },
      sentAt: new Date()
    });
  }
}

