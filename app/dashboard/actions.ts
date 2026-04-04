"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus } from "@prisma/client";
import { requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getInt(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createLocationAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();

  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Location name is required.");
  }

  const baseSlug = getOptionalString(formData, "slug") ?? slugify(name);
  const uniqueSlug = baseSlug ? `${baseSlug}-${Date.now().toString().slice(-5)}` : null;

  await prisma.location.create({
    data: {
      businessId,
      name,
      slug: uniqueSlug,
      timezone: getString(formData, "timezone") || "America/New_York",
      addressLine1: getOptionalString(formData, "addressLine1"),
      addressLine2: getOptionalString(formData, "addressLine2"),
      city: getOptionalString(formData, "city"),
      state: getOptionalString(formData, "state"),
      postalCode: getOptionalString(formData, "postalCode"),
      country: getString(formData, "country") || "US",
      isActive: true
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/channels");
}

export async function updateLocationAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const locationId = getString(formData, "locationId");

  if (!locationId) {
    throw new Error("Location is required.");
  }

  await prisma.location.updateMany({
    where: {
      id: locationId,
      businessId
    },
    data: {
      name: getString(formData, "name"),
      slug: getOptionalString(formData, "slug"),
      timezone: getString(formData, "timezone") || "America/New_York",
      addressLine1: getOptionalString(formData, "addressLine1"),
      addressLine2: getOptionalString(formData, "addressLine2"),
      city: getOptionalString(formData, "city"),
      state: getOptionalString(formData, "state"),
      postalCode: getOptionalString(formData, "postalCode"),
      country: getString(formData, "country") || "US",
      isActive: getBoolean(formData, "isActive")
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/channels");
}

export async function deleteLocationAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const locationId = getString(formData, "locationId");

  if (!locationId) {
    throw new Error("Location is required.");
  }

  await prisma.location.deleteMany({
    where: {
      id: locationId,
      businessId
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/channels");
}

export async function updateLeadStatusAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const leadId = getString(formData, "leadId");
  const status = getString(formData, "status") as LeadStatus;

  if (!leadId || !status) {
    throw new Error("Lead and status are required.");
  }

  await prisma.lead.updateMany({
    where: {
      id: leadId,
      businessId
    },
    data: {
      status,
      convertedAt: status === LeadStatus.BOOKED ? new Date() : null
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}

export async function updateMissedCallRuleAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const locationId = getString(formData, "locationId");

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      businessId
    }
  });

  if (!location) {
    throw new Error("Location not found.");
  }

  await prisma.missedCallRule.upsert({
    where: {
      locationId
    },
    update: {
      isEnabled: getBoolean(formData, "isEnabled"),
      delaySeconds: getInt(formData, "delaySeconds", 90),
      autoReplyText: getString(formData, "autoReplyText"),
      sendAfterHoursReply: getBoolean(formData, "sendAfterHoursReply"),
      afterHoursReplyText: getOptionalString(formData, "afterHoursReplyText")
    },
    create: {
      locationId,
      isEnabled: getBoolean(formData, "isEnabled"),
      delaySeconds: getInt(formData, "delaySeconds", 90),
      autoReplyText: getString(formData, "autoReplyText"),
      sendAfterHoursReply: getBoolean(formData, "sendAfterHoursReply"),
      afterHoursReplyText: getOptionalString(formData, "afterHoursReplyText")
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/channels");
}

export async function updateBusinessHoursAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const locationId = getString(formData, "locationId");

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      businessId
    }
  });

  if (!location) {
    throw new Error("Location not found.");
  }

  const updates = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    locationId,
    dayOfWeek,
    opensAt: getOptionalString(formData, `opensAt-${dayOfWeek}`),
    closesAt: getOptionalString(formData, `closesAt-${dayOfWeek}`),
    isClosed: getBoolean(formData, `isClosed-${dayOfWeek}`)
  }));

  await prisma.$transaction(
    updates.map((entry) =>
      prisma.businessHours.upsert({
        where: {
          locationId_dayOfWeek: {
            locationId,
            dayOfWeek: entry.dayOfWeek
          }
        },
        update: {
          opensAt: entry.isClosed ? null : entry.opensAt,
          closesAt: entry.isClosed ? null : entry.closesAt,
          isClosed: entry.isClosed
        },
        create: {
          locationId,
          dayOfWeek: entry.dayOfWeek,
          opensAt: entry.isClosed ? null : entry.opensAt,
          closesAt: entry.isClosed ? null : entry.closesAt,
          isClosed: entry.isClosed
        }
      })
    )
  );

  revalidatePath("/dashboard/settings");
}

export async function createPhoneNumberAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const locationId = getOptionalString(formData, "locationId");
  const phoneNumber = getString(formData, "phoneNumber");

  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  if (locationId) {
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        businessId
      }
    });

    if (!location) {
      throw new Error("Location not found.");
    }
  }

  await prisma.phoneNumber.create({
    data: {
      businessId,
      locationId,
      label: getOptionalString(formData, "label"),
      phoneNumber,
      twilioSid: getOptionalString(formData, "twilioSid"),
      voiceEnabled: getBoolean(formData, "voiceEnabled"),
      smsEnabled: getBoolean(formData, "smsEnabled"),
      isPrimary: getBoolean(formData, "isPrimary")
    }
  });

  revalidatePath("/dashboard/channels");
  revalidatePath("/dashboard/locations");
}

export async function updatePhoneNumberAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const phoneNumberId = getString(formData, "phoneNumberId");

  const phone = await prisma.phoneNumber.findFirst({
    where: {
      id: phoneNumberId,
      businessId
    }
  });

  if (!phone) {
    throw new Error("Phone number not found.");
  }

  await prisma.phoneNumber.update({
    where: {
      id: phone.id
    },
    data: {
      label: getOptionalString(formData, "label"),
      twilioSid: getOptionalString(formData, "twilioSid"),
      smsEnabled: getBoolean(formData, "smsEnabled"),
      voiceEnabled: getBoolean(formData, "voiceEnabled"),
      isPrimary: getBoolean(formData, "isPrimary")
    }
  });

  revalidatePath("/dashboard/channels");
  revalidatePath("/dashboard/locations");
}

export async function updateChatbotSettingsAction(formData: FormData) {
  const { businessId } = await requireBusinessAccess();
  const locationId = getString(formData, "locationId");

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      businessId
    }
  });

  if (!location) {
    throw new Error("Location not found.");
  }

  await prisma.chatbotSettings.upsert({
    where: {
      locationId
    },
    update: {
      isEnabled: getBoolean(formData, "isEnabled"),
      welcomeMessage: getOptionalString(formData, "welcomeMessage"),
      primaryColor: getOptionalString(formData, "primaryColor"),
      collectName: getBoolean(formData, "collectName"),
      collectPhone: getBoolean(formData, "collectPhone"),
      collectEmail: getBoolean(formData, "collectEmail"),
      handoffMessage: getOptionalString(formData, "handoffMessage")
    },
    create: {
      locationId,
      isEnabled: getBoolean(formData, "isEnabled"),
      welcomeMessage: getOptionalString(formData, "welcomeMessage"),
      primaryColor: getOptionalString(formData, "primaryColor"),
      collectName: getBoolean(formData, "collectName"),
      collectPhone: getBoolean(formData, "collectPhone"),
      collectEmail: getBoolean(formData, "collectEmail"),
      handoffMessage: getOptionalString(formData, "handoffMessage")
    }
  });

  revalidatePath("/dashboard/channels");
}
