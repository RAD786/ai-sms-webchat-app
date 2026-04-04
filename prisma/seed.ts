import {
  CallStatus,
  ConversationChannel,
  LeadStatus,
  MessageDirection,
  MessageStatus,
  PrismaClient,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: {
      slug: "revnex-demo-med-spa"
    },
    update: {
      name: "Revnex Demo Med Spa",
      websiteUrl: "https://demo.revnex.local",
      industry: "Med Spa",
      timezone: "America/New_York"
    },
    create: {
      name: "Revnex Demo Med Spa",
      slug: "revnex-demo-med-spa",
      websiteUrl: "https://demo.revnex.local",
      industry: "Med Spa",
      timezone: "America/New_York"
    }
  });

  const user = await prisma.user.upsert({
    where: {
      email: "owner@revnexdemo.local"
    },
    update: {
      businessId: business.id,
      role: UserRole.OWNER,
      firstName: "Demo",
      lastName: "Owner",
      isActive: true
    },
    create: {
      businessId: business.id,
      clerkUserId: "user_demo_owner",
      email: "owner@revnexdemo.local",
      firstName: "Demo",
      lastName: "Owner",
      role: UserRole.OWNER,
      isActive: true
    }
  });

  const location = await prisma.location.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "downtown"
      }
    },
    update: {
      name: "Downtown Med Spa",
      timezone: "America/New_York",
      addressLine1: "123 Main Street",
      city: "Miami",
      state: "FL",
      postalCode: "33101",
      country: "US",
      isActive: true
    },
    create: {
      businessId: business.id,
      name: "Downtown Med Spa",
      slug: "downtown",
      timezone: "America/New_York",
      addressLine1: "123 Main Street",
      city: "Miami",
      state: "FL",
      postalCode: "33101",
      country: "US",
      isActive: true
    }
  });

  const phoneNumber = await prisma.phoneNumber.upsert({
    where: {
      phoneNumber: "+13055550100"
    },
    update: {
      businessId: business.id,
      locationId: location.id,
      label: "Main Line",
      voiceEnabled: true,
      smsEnabled: true,
      isPrimary: true
    },
    create: {
      businessId: business.id,
      locationId: location.id,
      label: "Main Line",
      phoneNumber: "+13055550100",
      twilioSid: "PN_DEMO_MAIN_LINE",
      voiceEnabled: true,
      smsEnabled: true,
      isPrimary: true
    }
  });

  await prisma.businessHours.deleteMany({
    where: {
      locationId: location.id
    }
  });

  await prisma.businessHours.createMany({
    data: [
      { locationId: location.id, dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { locationId: location.id, dayOfWeek: 2, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { locationId: location.id, dayOfWeek: 3, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { locationId: location.id, dayOfWeek: 4, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { locationId: location.id, dayOfWeek: 5, opensAt: "09:00", closesAt: "18:00", isClosed: false },
      { locationId: location.id, dayOfWeek: 6, opensAt: "10:00", closesAt: "15:00", isClosed: false }
    ]
  });

  await prisma.missedCallRule.upsert({
    where: {
      locationId: location.id
    },
    update: {
      isEnabled: true,
      delaySeconds: 90,
      autoReplyText:
        "Thanks for calling Revnex Demo Med Spa. We missed your call, but reply here and our team will text you shortly.",
      sendAfterHoursReply: true,
      afterHoursReplyText:
        "Thanks for calling Revnex Demo Med Spa after hours. Reply here and our team will follow up when we reopen."
    },
    create: {
      locationId: location.id,
      isEnabled: true,
      delaySeconds: 90,
      autoReplyText:
        "Thanks for calling Revnex Demo Med Spa. We missed your call, but reply here and our team will text you shortly.",
      sendAfterHoursReply: true,
      afterHoursReplyText:
        "Thanks for calling Revnex Demo Med Spa after hours. Reply here and our team will follow up when we reopen."
    }
  });

  await prisma.chatbotSettings.upsert({
    where: {
      locationId: location.id
    },
    update: {
      isEnabled: false,
      welcomeMessage: "Hi, thanks for visiting Revnex Demo Med Spa. How can we help today?",
      primaryColor: "#677832",
      collectName: true,
      collectPhone: true,
      collectEmail: false,
      handoffMessage: "Thanks. A team member will follow up shortly."
    },
    create: {
      locationId: location.id,
      isEnabled: false,
      welcomeMessage: "Hi, thanks for visiting Revnex Demo Med Spa. How can we help today?",
      primaryColor: "#677832",
      collectName: true,
      collectPhone: true,
      collectEmail: false,
      handoffMessage: "Thanks. A team member will follow up shortly."
    }
  });

  await prisma.appointment.deleteMany({
    where: {
      businessId: business.id
    }
  });

  await prisma.message.deleteMany({
    where: {
      businessId: business.id,
      providerMessageId: {
        in: ["SM_DEMO_0001", "SM_DEMO_0002"]
      }
    }
  });

  await prisma.call.deleteMany({
    where: {
      businessId: business.id,
      providerCallId: "CA_DEMO_0001"
    }
  });

  await prisma.conversation.deleteMany({
    where: {
      businessId: business.id,
      externalThreadId: "sms:demo-main-line:+13055550199"
    }
  });

  await prisma.lead.deleteMany({
    where: {
      businessId: business.id,
      phone: "+13055550199"
    }
  });

  const lead = await prisma.lead.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      sourceChannel: ConversationChannel.SMS,
      sourceDescription: "Demo missed call",
      firstName: "Ava",
      lastName: "Parker",
      phone: "+13055550199",
      email: "ava.parker@example.com",
      status: LeadStatus.NEW,
      notes: "Seed lead for MVP walkthrough.",
      tags: ["demo", "missed-call"],
      smsOptedOut: false
    }
  });

  const conversation = await prisma.conversation.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      leadId: lead.id,
      channel: ConversationChannel.SMS,
      subject: "Demo missed-call follow-up",
      isOpen: true,
      externalThreadId: "sms:demo-main-line:+13055550199",
      metadata: {
        lastAutomatedReplyType: "business-hours"
      },
      lastMessageAt: new Date()
    }
  });

  await prisma.message.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      leadId: lead.id,
      conversationId: conversation.id,
      phoneNumberId: phoneNumber.id,
      channel: ConversationChannel.SMS,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
      body: "Thanks for calling Revnex Demo Med Spa. We missed your call. How can we help?",
      fromAddress: phoneNumber.phoneNumber,
      toAddress: lead.phone,
      providerMessageId: "SM_DEMO_0001",
      metadata: {
        automated: true,
        reason: "missed_call"
      },
      sentAt: new Date()
    }
  });

  await prisma.message.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      leadId: lead.id,
      conversationId: conversation.id,
      phoneNumberId: phoneNumber.id,
      channel: ConversationChannel.SMS,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.RECEIVED,
      body: "Can I book for Friday?",
      fromAddress: lead.phone,
      toAddress: phoneNumber.phoneNumber,
      providerMessageId: "SM_DEMO_0002",
      sentAt: new Date()
    }
  });

  await prisma.call.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      leadId: lead.id,
      phoneNumberId: phoneNumber.id,
      providerCallId: "CA_DEMO_0001",
      fromPhone: lead.phone ?? "+13055550199",
      toPhone: phoneNumber.phoneNumber,
      status: CallStatus.MISSED,
      smsSent: true,
      smsSentAt: new Date(),
      missedAt: new Date(),
      automationStatus: "sent",
      receivedAt: new Date()
    }
  });

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      leadId: lead.id,
      conversationId: conversation.id,
      title: "Consultation",
      description: "Demo consultation booking placeholder.",
      startsAt: new Date("2026-04-07T15:00:00.000Z"),
      endsAt: new Date("2026-04-07T15:30:00.000Z")
    }
  });

  console.log(
    JSON.stringify(
      {
        businessId: business.id,
        locationId: location.id,
        userId: user.id,
        phoneNumberId: phoneNumber.id,
        seeded: true
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
