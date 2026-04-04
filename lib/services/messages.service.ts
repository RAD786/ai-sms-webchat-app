import "server-only";

import {
  ConversationChannel,
  MessageDirection,
  MessageStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

export type FindOrCreateConversationInput = {
  businessId: string;
  locationId?: string | null;
  leadId?: string | null;
  channel: ConversationChannel;
  subject?: string | null;
  externalThreadId?: string | null;
  metadata?: JsonRecord;
};

export type CreateMessageInput = {
  businessId: string;
  locationId?: string | null;
  leadId?: string | null;
  conversationId?: string | null;
  phoneNumberId?: string | null;
  channel: ConversationChannel;
  direction: MessageDirection;
  body: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  providerMessageId?: string | null;
  status?: MessageStatus;
  subject?: string | null;
  externalThreadId?: string | null;
  metadata?: JsonRecord;
  conversationMetadata?: JsonRecord;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
};

function mergeMetadata(
  existingValue: Prisma.JsonValue | null | undefined,
  patch?: JsonRecord
): Prisma.InputJsonValue | undefined {
  if (!patch) {
    return undefined;
  }

  const base =
    existingValue && typeof existingValue === "object" && !Array.isArray(existingValue)
      ? (existingValue as JsonRecord)
      : {};

  return {
    ...base,
    ...patch
  } as Prisma.InputJsonValue;
}

export class MessagesService {
  static async getConversation(businessId: string, conversationId: string) {
    return prisma.conversation.findFirst({
      where: {
        id: conversationId,
        businessId
      },
      include: {
        lead: true
      }
    });
  }

  static async findOrCreateConversation(input: FindOrCreateConversationInput) {
    let existingConversation = null;

    if (input.externalThreadId) {
      existingConversation = await prisma.conversation.findFirst({
        where: {
          businessId: input.businessId,
          channel: input.channel,
          externalThreadId: input.externalThreadId
        }
      });
    }

    if (!existingConversation && input.leadId) {
      existingConversation = await prisma.conversation.findFirst({
        where: {
          businessId: input.businessId,
          leadId: input.leadId,
          channel: input.channel,
          isOpen: true
        },
        orderBy: {
          updatedAt: "desc"
        }
      });
    }

    if (existingConversation) {
      return prisma.conversation.update({
        where: {
          id: existingConversation.id
        },
        data: {
          locationId: input.locationId ?? existingConversation.locationId,
          leadId: input.leadId ?? existingConversation.leadId,
          subject: input.subject ?? existingConversation.subject,
          externalThreadId: input.externalThreadId ?? existingConversation.externalThreadId,
          metadata: mergeMetadata(existingConversation.metadata, input.metadata)
        }
      });
    }

    return prisma.conversation.create({
      data: {
        businessId: input.businessId,
        locationId: input.locationId ?? null,
        leadId: input.leadId ?? null,
        channel: input.channel,
        subject: input.subject ?? null,
        externalThreadId: input.externalThreadId ?? null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
        isOpen: true
      }
    });
  }

  static async updateConversationMetadata(
    businessId: string,
    conversationId: string,
    metadataPatch: JsonRecord
  ) {
    const conversation = await this.getConversation(businessId, conversationId);

    if (!conversation) {
      throw new Error("Conversation not found for this business.");
    }

    return prisma.conversation.update({
      where: {
        id: conversationId
      },
      data: {
        metadata: mergeMetadata(conversation.metadata, metadataPatch)
      }
    });
  }

  static async createMessage(input: CreateMessageInput) {
    const conversation =
      input.conversationId != null
        ? await this.getConversation(input.businessId, input.conversationId)
        : await this.findOrCreateConversation({
            businessId: input.businessId,
            locationId: input.locationId,
            leadId: input.leadId,
            channel: input.channel,
            subject: input.subject,
            externalThreadId: input.externalThreadId,
            metadata: input.conversationMetadata
          });

    if (!conversation) {
      throw new Error("Conversation not found for this business.");
    }

    const timestamp = input.sentAt ?? new Date();

    return prisma.$transaction(async (tx) => {
      const targetLeadId = input.leadId ?? conversation.leadId;

      const message = await tx.message.create({
        data: {
          businessId: input.businessId,
          locationId: input.locationId ?? conversation.locationId,
          leadId: targetLeadId,
          conversationId: conversation.id,
          phoneNumberId: input.phoneNumberId ?? null,
          channel: input.channel,
          direction: input.direction,
          status: input.status ?? MessageStatus.QUEUED,
          body: input.body,
          fromAddress: input.fromAddress ?? null,
          toAddress: input.toAddress ?? null,
          providerMessageId: input.providerMessageId ?? null,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
          sentAt: input.sentAt ?? null,
          deliveredAt: input.deliveredAt ?? null,
          readAt: input.readAt ?? null
        }
      });

      await tx.conversation.update({
        where: {
          id: conversation.id
        },
        data: {
          locationId: input.locationId ?? conversation.locationId,
          leadId: targetLeadId,
          lastMessageAt: timestamp,
          metadata: mergeMetadata(conversation.metadata, input.conversationMetadata),
          updatedAt: new Date()
        }
      });

      if (targetLeadId) {
        await tx.lead.update({
          where: {
            id: targetLeadId
          },
          data: {
            lastContactedAt: timestamp
          }
        });
      }

      return message;
    });
  }

  static async recordInboundMessage(
    input: Omit<CreateMessageInput, "direction" | "status"> & {
      status?: MessageStatus;
    }
  ) {
    return this.createMessage({
      ...input,
      direction: MessageDirection.INBOUND,
      status: input.status ?? MessageStatus.RECEIVED
    });
  }

  static async recordOutboundMessage(
    input: Omit<CreateMessageInput, "direction"> & {
      status?: MessageStatus;
    }
  ) {
    return this.createMessage({
      ...input,
      direction: MessageDirection.OUTBOUND,
      status: input.status ?? MessageStatus.SENT
    });
  }

  static buildMessageListWhere(args: {
    businessId: string;
    channel?: ConversationChannel;
    leadId?: string;
    conversationId?: string;
  }): Prisma.MessageWhereInput {
    return {
      businessId: args.businessId,
      channel: args.channel,
      leadId: args.leadId,
      conversationId: args.conversationId
    };
  }
}
