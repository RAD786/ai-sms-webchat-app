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

  static logCallAutomationEvent(
    message: string,
    payload: TwilioVoiceWebhookPayload,
    details?: Record<string, unknown>
  ) {
    console.info("[missed-call.automation]", message, {
      callSid: payload.callSid ?? null,
      callStatus: payload.callStatus ?? null,
      from: payload.fromPhone,
      to: payload.toPhone,
      ...details
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
      this.logCallAutomationEvent("Skipping call status processing without CallSid", payload);
      return null;
    }

    this.logCallAutomationEvent("Starting call status processing", payload);

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
      this.logCallAutomationEvent("No call record found after initial log", payload);
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

    this.logCallAutomationEvent("Updated call with latest status", payload, {
      internalStatus: updatedCall.status,
      automationStatus: updatedCall.automationStatus
    });

    if (nextStatus !== CallStatus.MISSED) {
      this.logCallAutomationEvent("Call is not missed; automation will not fire", payload, {
        internalStatus: updatedCall.status
      });
      return updatedCall;
    }

    if (!updatedCall.location?.missedCallRule?.isEnabled) {
      this.logCallAutomationEvent("Missed-call rule is disabled", payload, {
        callId: updatedCall.id
      });
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "rule_disabled"
        }
      });
    }

    if (updatedCall.smsSent) {
      this.logCallAutomationEvent("Automation SMS already sent for this call", payload, {
        callId: updatedCall.id
      });
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "already_sent"
        }
      });
    }

    if (updatedCall.phoneNumber && !updatedCall.phoneNumber.smsEnabled) {
      this.logCallAutomationEvent("Twilio number does not have SMS enabled", payload, {
        callId: updatedCall.id,
        phoneNumberId: updatedCall.phoneNumberId
      });
      return prisma.call.update({
        where: { id: updatedCall.id },
        data: {
          automationStatus: "sms_disabled"
        }
      });
    }

    const duplicateCall = await this.findRecentAutomatedDuplicate(updatedCall);

    if (duplicateCall) {
      this.logCallAutomationEvent("Duplicate recent missed-call automation detected", payload, {
        callId: updatedCall.id,
        duplicateCallId: duplicateCall.id
      });
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
      this.logCallAutomationEvent("Lead has opted out of SMS", payload, {
        callId: updatedCall.id,
        leadId: hydratedLead.id
      });
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
      this.logCallAutomationEvent("No missed-call message configured for this status window", payload, {
        callId: updatedCall.id,
        isOpen: businessHoursStatus?.isOpen ?? null
      });
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
      this.logCallAutomationEvent("Call could not be claimed for SMS send", payload, {
        callId: updatedCall.id
      });
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
      this.logCallAutomationEvent("Call was already updated before SMS send", payload, {
        callId: updatedCall.id,
        freshCallFound: Boolean(freshCall),
        smsSent: freshCall?.smsSent ?? null
      });
      return freshCall;
    }

    try {
      this.logCallAutomationEvent("Sending missed-call SMS", payload, {
        callId: updatedCall.id,
        replyType,
        to: updatedCall.fromPhone,
        from: updatedCall.phoneNumber?.phoneNumber ?? updatedCall.toPhone
      });

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

      const completedCall = await prisma.call.update({
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

      this.logCallAutomationEvent("Missed-call SMS sent successfully", payload, {
        callId: updatedCall.id,
        replyType,
        outboundMessageSid: sentMessage.sid,
        outboundMessageStatus: sentMessage.status ?? null
      });

      return completedCall;
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

      console.error("[missed-call.automation]", "Missed-call SMS send failed", {
        callSid: payload.callSid ?? null,
        callStatus: payload.callStatus ?? null,
        from: payload.fromPhone,
        to: payload.toPhone,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  static async processInboundSmsReply(payload: TwilioSmsWebhookPayload) {
    const phoneContext = await this.resolvePhoneNumberContext(payload.toPhone);

    if (!phoneContext) {
      console.warn("Inbound SMS received for unknown Twilio number", {
        toPhone: payload.toPhone,
        fromPhone: payload.fromPhone,
        messageSid: payload.messageSid ?? null
      });

      return {
        outcome: "unknown_phone_number",
        messageSid: payload.messageSid ?? null,
        automatedReplySent: false
      };
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
        return {
          outcome: "duplicate_message",
          messageSid: payload.messageSid ?? null,
          inboundMessageId: existingMessage.id,
          automatedReplySent: false
        };
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
      return {
        outcome: "lead_not_found_after_create",
        messageSid: payload.messageSid ?? null,
        inboundMessageId: inboundMessage.id,
        automatedReplySent: false
      };
    }

    if (refreshedLead.smsOptedOut) {
      return {
        outcome: "lead_opted_out",
        messageSid: payload.messageSid ?? null,
        inboundMessageId: inboundMessage.id,
        automatedReplySent: false
      };
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
        return {
          outcome: "stop_keyword",
          messageSid: payload.messageSid ?? null,
          inboundMessageId: inboundMessage.id,
          automatedReplySent: false
        };
      default:
        replyBody = this.buildFallbackText(phoneContext);
        replyType = "keyword_fallback";
        break;
    }

    try {
      const outboundMessage = await this.sendAutomatedSmsReply({
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

      return {
        outcome: "automated_reply_sent",
        messageSid: payload.messageSid ?? null,
        inboundMessageId: inboundMessage.id,
        automatedReplySent: true,
        automatedReplyType: replyType,
        automatedReplyProviderMessageId: outboundMessage.providerMessageId,
        automatedReplyStatus: outboundMessage.status
      };
    } catch (error) {
      console.error("Inbound keyword auto reply failed", error);

      return {
        outcome: "automated_reply_failed",
        messageSid: payload.messageSid ?? null,
        inboundMessageId: inboundMessage.id,
        automatedReplySent: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
