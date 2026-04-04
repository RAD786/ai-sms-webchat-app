import "server-only";

import { CallStatus, ConversationChannel, MessageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessHoursService } from "@/lib/services/business-hours.service";
import { LeadsService } from "@/lib/services/leads.service";
import { MessagesService } from "@/lib/services/messages.service";
import {
  TwilioService,
  type TwilioSmsWebhookPayload,
  type TwilioVoiceWebhookPayload
} from "@/lib/services/twilio-service";
import { normalizePhoneNumber } from "@/lib/utils/phone";

const RECENT_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapTwilioCallStatus(status?: string, duration?: number | null) {
  switch (status) {
    case "queued":
    case "initiated":
    case "ringing":
    case "in-progress":
      return CallStatus.RINGING;
    case "busy":
    case "failed":
    case "canceled":
    case "no-answer":
      return CallStatus.MISSED;
    case "completed":
      return duration && duration > 0 ? CallStatus.ANSWERED : CallStatus.MISSED;
    default:
      return CallStatus.RINGING;
  }
}

function normalizeSmsBody(text?: string | null) {
  return text?.trim() ?? "";
}

function getKeyword(body: string) {
  return body.trim().toUpperCase();
}

function findIntent(body: string) {
  const normalized = body.trim().toLowerCase();

  if (!normalized) {
    return "fallback" as const;
  }

  if (normalized.includes("book")) {
    return "book" as const;
  }

  if (normalized.includes("hours")) {
    return "hours" as const;
  }

  if (normalized.includes("address")) {
    return "address" as const;
  }

  if (STOP_KEYWORDS.has(normalized.toUpperCase())) {
    return "stop" as const;
  }

  return "fallback" as const;
}

export class MissedCallService {
  static async resolvePhoneNumberContext(toPhone: string) {
    const normalizedToPhone = normalizePhoneNumber(toPhone);

    if (!normalizedToPhone) {
      return null;
    }

    return prisma.phoneNumber.findFirst({
      where: {
        phoneNumber: normalizedToPhone
      },
      include: {
        location: {
          include: {
            business: {
              select: {
                websiteUrl: true,
                name: true
              }
            },
            missedCallRule: true,
            businessHours: {
              orderBy: {
                dayOfWeek: "asc"
              }
            }
          }
        }
      }
    });
  }

  static buildBookingLink(phoneContext: Awaited<ReturnType<typeof MissedCallService.resolvePhoneNumberContext>>) {
    const websiteUrl = phoneContext?.location?.business?.websiteUrl;

    if (!websiteUrl) {
      return "our website";
    }

    return `${websiteUrl.replace(/\/$/, "")}/book`;
  }

  static buildAddressText(phoneContext: NonNullable<Awaited<ReturnType<typeof MissedCallService.resolvePhoneNumberContext>>>) {
    const location = phoneContext.location;

    if (!location) {
      return "Our team will share the address shortly.";
    }

    const parts = [
      location.addressLine1,
      location.addressLine2,
      location.city,
      location.state,
      location.postalCode
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "Our team will share the address shortly.";
  }

  static buildHoursText(phoneContext: NonNullable<Awaited<ReturnType<typeof MissedCallService.resolvePhoneNumberContext>>>) {
    const location = phoneContext.location;

    if (!location) {
      return "Our team will share current hours shortly.";
    }

    const openStatus = BusinessHoursService.isOpenAt({
      hours: location.businessHours,
      timezone: location.timezone
    });

    return BusinessHoursService.formatHoursForDay(openStatus.activeWindow, openStatus.currentDayOfWeek);
  }

  static buildFallbackText(phoneContext: Awaited<ReturnType<typeof MissedCallService.resolvePhoneNumberContext>>) {
    const bookingLink = this.buildBookingLink(phoneContext);

    return `Thanks for reaching out. A team member will follow up soon. You can also book here: ${bookingLink}`;
  }

  static async sendAutomatedSmsReply(args: {
    businessId: string;
    locationId?: string | null;
    leadId: string;
    conversationId: string;
    phoneNumberId?: string | null;
    fromAddress: string;
    toAddress: string;
    body: string;
    metadata: Record<string, unknown>;
    conversationMetadata?: Record<string, unknown>;
  }) {
    const sentMessage = await TwilioService.sendSms({
      to: args.toAddress,
      body: args.body,
      from: args.fromAddress
    });

    return MessagesService.recordOutboundMessage({
      businessId: args.businessId,
      locationId: args.locationId,
      leadId: args.leadId,
      conversationId: args.conversationId,
      phoneNumberId: args.phoneNumberId,
      channel: ConversationChannel.SMS,
      body: args.body,
      fromAddress: args.fromAddress,
      toAddress: args.toAddress,
      providerMessageId: sentMessage.sid,
      status: MessageStatus.SENT,
      metadata: args.metadata,
      conversationMetadata: args.conversationMetadata,
      sentAt: new Date()
    });
  }

  static async logIncomingCall(payload: TwilioVoiceWebhookPayload) {
    const phoneContext = await this.resolvePhoneNumberContext(payload.toPhone);

    if (!phoneContext || !payload.callSid) {
      return null;
    }

    const fromPhone = normalizePhoneNumber(payload.fromPhone) ?? payload.fromPhone;
    const toPhone = normalizePhoneNumber(payload.toPhone) ?? payload.toPhone;
    const derivedStatus = mapTwilioCallStatus(payload.callStatus, payload.callDuration);
    const now = new Date();

    return prisma.call.upsert({
      where: {
        providerCallId: payload.callSid
      },
      update: {
        fromPhone,
        toPhone,
        status: derivedStatus,
        receivedAt: now,
        metadata: {
          twilioCallStatus: payload.callStatus ?? null,
          direction: payload.direction ?? null,
          answeredBy: payload.answeredBy ?? null
        }
      },
      create: {
        businessId: phoneContext.businessId,
        locationId: phoneContext.locationId,
        phoneNumberId: phoneContext.id,
        providerCallId: payload.callSid,
        fromPhone,
        toPhone,
        status: derivedStatus,
        receivedAt: now,
        metadata: {
          twilioCallStatus: payload.callStatus ?? null,
          direction: payload.direction ?? null,
          answeredBy: payload.answeredBy ?? null
        }
      }
    });
  }

  static async findRecentAutomatedDuplicate(call: {
    id: string;
    businessId: string;
    locationId: string | null;
    fromPhone: string;
    toPhone: string;
  }) {
    return prisma.call.findFirst({
      where: {
        businessId: call.businessId,
        locationId: call.locationId,
        fromPhone: call.fromPhone,
        toPhone: call.toPhone,
        smsSent: true,
        id: {
          not: call.id
        },
        smsSentAt: {
          gte: new Date(Date.now() - RECENT_DUPLICATE_WINDOW_MS)
        }
      },
      orderBy: {
        smsSentAt: "desc"
      }
    });
  }

  static async processCallStatus(payload: TwilioVoiceWebhookPayload) {
    if (!payload.callSid) {
      return null;
    }

    await this.logIncomingCall(payload);

    const call = await prisma.call.findUnique({
      where: {
        providerCallId: payload.callSid
      },
      include: {
        location: {
          include: {
            missedCallRule: true,
            businessHours: true
          }
        },
        phoneNumber: true,
        lead: true
      }
    });

    if (!call) {
      return null;
    }

    const nextStatus = mapTwilioCallStatus(payload.callStatus, payload.callDuration);
    const now = new Date();

    const updatedCall = await prisma.call.update({
      where: {
        id: call.id
      },
      data: {
        status: nextStatus,
        durationSeconds: payload.callDuration ?? call.durationSeconds,
        endedAt:
          payload.callStatus && ["completed", "busy", "failed", "canceled", "no-answer"].includes(payload.callStatus)
            ? now
            : call.endedAt,
        missedAt: nextStatus === CallStatus.MISSED ? call.missedAt ?? now : call.missedAt,
        automationStatus: nextStatus === CallStatus.MISSED ? "missed_detected" : "not_missed",
        metadata: {
          twilioCallStatus: payload.callStatus ?? null,
          direction: payload.direction ?? null,
          answeredBy: payload.answeredBy ?? null
        }
      },
      include: {
        location: {
          include: {
            missedCallRule: true,
            businessHours: true
          }
        },
        phoneNumber: true,
        lead: true
      }
    });

    if (nextStatus !== CallStatus.MISSED) {
      return updatedCall;
    }

    if (!updatedCall.location?.missedCallRule?.isEnabled) {
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "rule_disabled"
        }
      });
    }

    if (updatedCall.smsSent) {
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "already_sent"
        }
      });
    }

    if (updatedCall.phoneNumber && !updatedCall.phoneNumber.smsEnabled) {
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "sms_disabled"
        }
      });
    }

    const duplicateCall = await this.findRecentAutomatedDuplicate(updatedCall);

    if (duplicateCall) {
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "duplicate_recent"
        }
      });
    }

    const lead =
      updatedCall.lead ??
      (await LeadsService.findOrCreate({
        businessId: updatedCall.businessId,
        locationId: updatedCall.locationId,
        phone: updatedCall.fromPhone,
        sourceChannel: ConversationChannel.SMS,
        sourceDescription: "Missed call",
        tags: ["missed-call"]
      }));

    const hydratedLead = await prisma.lead.findUnique({
      where: {
        id: lead.id
      }
    });

    if (!hydratedLead) {
      throw new Error("Lead could not be resolved for missed call.");
    }

    if (hydratedLead.smsOptedOut) {
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          leadId: hydratedLead.id,
          automationStatus: "lead_opted_out"
        }
      });
    }

    const conversation = await MessagesService.findOrCreateConversation({
      businessId: updatedCall.businessId,
      locationId: updatedCall.locationId,
      leadId: hydratedLead.id,
      channel: ConversationChannel.SMS,
      subject: "SMS conversation",
      externalThreadId: `sms:${updatedCall.phoneNumberId ?? "unknown"}:${updatedCall.fromPhone}`,
      metadata: {
        lastCallerPhone: updatedCall.fromPhone,
        lastDialedPhone: updatedCall.toPhone,
        latestMissedCallId: updatedCall.id
      }
    });

    const businessHoursStatus =
      updatedCall.locationId && updatedCall.location
        ? BusinessHoursService.isOpenAt({
            hours: updatedCall.location.businessHours,
            timezone: updatedCall.location.timezone
          })
        : null;

    const rule = updatedCall.location.missedCallRule;

    let messageBody: string | null = null;
    let replyType: "business_hours" | "after_hours" | null = null;

    if (businessHoursStatus?.isOpen) {
      messageBody = rule.autoReplyText;
      replyType = "business_hours";
    } else if (rule.sendAfterHoursReply && rule.afterHoursReplyText) {
      messageBody = rule.afterHoursReplyText;
      replyType = "after_hours";
    }

    if (!messageBody) {
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          leadId: hydratedLead.id,
          automationStatus: "outside_hours_no_reply"
        }
      });
    }

    const claim = await prisma.call.updateMany({
      where: {
        id: updatedCall.id,
        smsSent: false,
        automationStatus: {
          notIn: ["pending_send", "sent"]
        }
      },
      data: {
        leadId: hydratedLead.id,
        automationStatus: "pending_send"
      }
    });

    if (claim.count === 0) {
      return prisma.call.findUnique({
        where: {
          id: updatedCall.id
        }
      });
    }

    if (rule.delaySeconds > 0) {
      // MVP approach: inline wait. Move this to a durable job/queue when scaling beyond simple webhook-driven automation.
      await sleep(rule.delaySeconds * 1000);
    }

    const freshCall = await prisma.call.findUnique({
      where: {
        id: updatedCall.id
      }
    });

    if (!freshCall || freshCall.smsSent) {
      return freshCall;
    }

    try {
      const sentMessage = await TwilioService.sendSms({
        to: updatedCall.fromPhone,
        body: messageBody,
        from: updatedCall.phoneNumber?.phoneNumber ?? undefined
      });

      await MessagesService.recordOutboundMessage({
        businessId: updatedCall.businessId,
        locationId: updatedCall.locationId,
        leadId: hydratedLead.id,
        conversationId: conversation.id,
        phoneNumberId: updatedCall.phoneNumberId,
        channel: ConversationChannel.SMS,
        body: messageBody,
        fromAddress: updatedCall.phoneNumber?.phoneNumber ?? updatedCall.toPhone,
        toAddress: updatedCall.fromPhone,
        providerMessageId: sentMessage.sid,
        status: MessageStatus.SENT,
        metadata: {
          automated: true,
          automationType: "missed_call",
          replyType
        },
        conversationMetadata: {
          latestMissedCallId: updatedCall.id,
          lastAutomatedReplyType: replyType,
          lastAutomatedReplyAt: new Date().toISOString()
        },
        sentAt: new Date()
      });

      return prisma.call.update({
        where: {
          id: updatedCall.id
        },
        data: {
          leadId: hydratedLead.id,
          smsSent: true,
          smsSentAt: new Date(),
          automationStatus: "sent"
        }
      });
    } catch (error) {
      await prisma.call.update({
        where: {
          id: updatedCall.id
        },
        data: {
          leadId: hydratedLead.id,
          automationStatus: "send_failed",
          summary: error instanceof Error ? error.message.slice(0, 190) : "Unknown send failure"
        }
      });

      throw error;
    }
  }

  static async processInboundSmsReply(payload: TwilioSmsWebhookPayload) {
    const phoneContext = await this.resolvePhoneNumberContext(payload.toPhone);

    if (!phoneContext) {
      return null;
    }

    const fromPhone = normalizePhoneNumber(payload.fromPhone) ?? payload.fromPhone;
    const toPhone = normalizePhoneNumber(payload.toPhone) ?? payload.toPhone;
    const body = normalizeSmsBody(payload.body);

    const lead = await LeadsService.findOrCreate({
      businessId: phoneContext.businessId,
      locationId: phoneContext.locationId,
      phone: fromPhone,
      sourceChannel: ConversationChannel.SMS,
      sourceDescription: "Inbound SMS"
    });

    if (payload.messageSid) {
      const existingMessage = await prisma.message.findUnique({
        where: {
          providerMessageId: payload.messageSid
        }
      });

      if (existingMessage) {
        return existingMessage;
      }
    }

    const keyword = getKeyword(body);
    const intent = findIntent(body);

    if (STOP_KEYWORDS.has(keyword)) {
      await LeadsService.setSmsOptOut(phoneContext.businessId, lead.id, true);
    }

    const conversation = await MessagesService.findOrCreateConversation({
      businessId: phoneContext.businessId,
      locationId: phoneContext.locationId,
      leadId: lead.id,
      channel: ConversationChannel.SMS,
      subject: "SMS conversation",
      externalThreadId: `sms:${phoneContext.id}:${fromPhone}`,
      metadata: {
        lastInboundReplyAt: new Date().toISOString()
      }
    });

    const inboundMessage = await MessagesService.recordInboundMessage({
      businessId: phoneContext.businessId,
      locationId: phoneContext.locationId,
      leadId: lead.id,
      conversationId: conversation.id,
      phoneNumberId: phoneContext.id,
      channel: ConversationChannel.SMS,
      body,
      fromAddress: fromPhone,
      toAddress: toPhone,
      providerMessageId: payload.messageSid ?? null,
      metadata: {
        keyword: keyword || null
      },
      conversationMetadata: {
        lastInboundReplyAt: new Date().toISOString(),
        lastInboundReplyKeyword: keyword || null
      },
      sentAt: new Date()
    });

    const refreshedLead = await prisma.lead.findUnique({
      where: {
        id: lead.id
      }
    });

    if (!refreshedLead) {
      return inboundMessage;
    }

    if (refreshedLead.smsOptedOut) {
      return inboundMessage;
    }

    let replyBody: string;
    let replyType: string;

    switch (intent) {
      case "book":
        replyBody = `You can book here: ${this.buildBookingLink(phoneContext)}`;
        replyType = "keyword_book";
        break;
      case "hours":
        replyBody = this.buildHoursText(phoneContext);
        replyType = "keyword_hours";
        break;
      case "address":
        replyBody = this.buildAddressText(phoneContext);
        replyType = "keyword_address";
        break;
      case "stop":
        return inboundMessage;
      default:
        replyBody = this.buildFallbackText(phoneContext);
        replyType = "keyword_fallback";
        break;
    }

    try {
      await this.sendAutomatedSmsReply({
        businessId: phoneContext.businessId,
        locationId: phoneContext.locationId,
        leadId: refreshedLead.id,
        conversationId: conversation.id,
        phoneNumberId: phoneContext.id,
        fromAddress: toPhone,
        toAddress: fromPhone,
        body: replyBody,
        metadata: {
          automated: true,
          automationType: "inbound_keyword",
          intent
        },
        conversationMetadata: {
          lastAutomatedReplyType: replyType,
          lastAutomatedReplyAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Inbound keyword auto reply failed", error);
    }

    return inboundMessage;
  }
}
