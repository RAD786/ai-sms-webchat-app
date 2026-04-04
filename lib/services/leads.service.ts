import "server-only";

import { ConversationChannel, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/utils/phone";

export type UpsertLeadInput = {
  businessId: string;
  locationId?: string | null;
  sourceChannel?: ConversationChannel;
  sourceDescription?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  tags?: string[];
  status?: LeadStatus;
};

export type UpdateLeadInput = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: LeadStatus;
  tags?: string[];
  sourceDescription?: string | null;
  smsOptedOut?: boolean;
};

export class LeadsService {
  static async getById(businessId: string, leadId: string) {
    return prisma.lead.findFirst({
      where: {
        id: leadId,
        businessId
      }
    });
  }

  static async findByPhone(businessId: string, phone: string) {
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone) {
      return null;
    }

    return prisma.lead.findFirst({
      where: {
        businessId,
        phone: normalizedPhone
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  static async findByEmail(businessId: string, email: string) {
    return prisma.lead.findFirst({
      where: {
        businessId,
        email: email.trim().toLowerCase()
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  static async findOrCreate(input: UpsertLeadInput) {
    const normalizedPhone = normalizePhoneNumber(input.phone);
    const normalizedEmail = input.email?.trim().toLowerCase() ?? null;

    let existingLead = null;

    if (normalizedPhone) {
      existingLead = await this.findByPhone(input.businessId, normalizedPhone);
    }

    if (!existingLead && normalizedEmail) {
      existingLead = await this.findByEmail(input.businessId, normalizedEmail);
    }

    if (existingLead) {
      return prisma.lead.update({
        where: {
          id: existingLead.id
        },
        data: {
          locationId: input.locationId ?? existingLead.locationId,
          firstName: input.firstName ?? existingLead.firstName,
          lastName: input.lastName ?? existingLead.lastName,
          email: normalizedEmail ?? existingLead.email,
          phone: normalizedPhone ?? existingLead.phone,
          notes: input.notes ?? existingLead.notes,
          sourceChannel: input.sourceChannel ?? existingLead.sourceChannel,
          sourceDescription: input.sourceDescription ?? existingLead.sourceDescription,
          status: input.status ?? existingLead.status,
          tags: input.tags?.length
            ? Array.from(new Set([...existingLead.tags, ...input.tags]))
            : existingLead.tags
        }
      });
    }

    return prisma.lead.create({
      data: {
        businessId: input.businessId,
        locationId: input.locationId ?? null,
        sourceChannel: input.sourceChannel,
        sourceDescription: input.sourceDescription ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        email: normalizedEmail,
        phone: normalizedPhone,
        notes: input.notes ?? null,
        tags: input.tags ?? [],
        status: input.status ?? LeadStatus.NEW
      }
    });
  }

  static async updateLead(businessId: string, leadId: string, input: UpdateLeadInput) {
    const existingLead = await this.getById(businessId, leadId);

    if (!existingLead) {
      throw new Error("Lead not found for this business.");
    }

    return prisma.lead.update({
      where: {
        id: leadId
      },
      data: {
        firstName: input.firstName ?? existingLead.firstName,
        lastName: input.lastName ?? existingLead.lastName,
        email: input.email ? input.email.trim().toLowerCase() : existingLead.email,
        phone: input.phone ? normalizePhoneNumber(input.phone) : existingLead.phone,
        notes: input.notes ?? existingLead.notes,
        status: input.status ?? existingLead.status,
        sourceDescription: input.sourceDescription ?? existingLead.sourceDescription,
        tags: input.tags ?? existingLead.tags,
        smsOptedOut: input.smsOptedOut ?? existingLead.smsOptedOut,
        smsOptedOutAt:
          input.smsOptedOut === undefined
            ? existingLead.smsOptedOutAt
            : input.smsOptedOut
              ? new Date()
              : null
      }
    });
  }

  static async updateStatus(businessId: string, leadId: string, status: LeadStatus) {
    const existingLead = await this.getById(businessId, leadId);

    if (!existingLead) {
      throw new Error("Lead not found for this business.");
    }

    return prisma.lead.update({
      where: {
        id: leadId
      },
      data: {
        status,
        convertedAt: status === LeadStatus.BOOKED ? new Date() : existingLead.convertedAt
      }
    });
  }

  static async touchLastContactedAt(businessId: string, leadId: string, at = new Date()) {
    const existingLead = await this.getById(businessId, leadId);

    if (!existingLead) {
      throw new Error("Lead not found for this business.");
    }

    return prisma.lead.update({
      where: {
        id: leadId
      },
      data: {
        lastContactedAt: at
      }
    });
  }

  static async setSmsOptOut(businessId: string, leadId: string, optedOut: boolean) {
    const existingLead = await this.getById(businessId, leadId);

    if (!existingLead) {
      throw new Error("Lead not found for this business.");
    }

    return prisma.lead.update({
      where: {
        id: leadId
      },
      data: {
        smsOptedOut: optedOut,
        smsOptedOutAt: optedOut ? new Date() : null
      }
    });
  }

  static buildLeadSearchWhere(businessId: string, query?: string): Prisma.LeadWhereInput {
    const trimmed = query?.trim();

    if (!trimmed) {
      return { businessId };
    }

    return {
      businessId,
      OR: [
        { firstName: { contains: trimmed, mode: "insensitive" } },
        { lastName: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
        { phone: { contains: trimmed } }
      ]
    };
  }
}
