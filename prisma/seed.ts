import {
  AppointmentStatus,
  CallStatus,
  ConversationChannel,
  LeadStatus,
  MessageDirection,
  MessageStatus,
  PrismaClient,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_BUSINESS_SLUG = "revnex-demo-aesthetics";
const DEMO_OWNER_EMAIL = "owner@revnexdemo.local";
const DEMO_ADMIN_EMAIL = "ops@revnexdemo.local";

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return addMinutes(date, hours * 60);
}

function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}

async function main() {
  const now = new Date();

  const business = await prisma.business.upsert({
    where: {
      slug: DEMO_BUSINESS_SLUG
    },
    update: {
      name: "Revnex Aesthetics Demo",
      websiteUrl: "https://demo.revnex.local",
      industry: "Medical Spa",
      timezone: "America/New_York"
    },
    create: {
      name: "Revnex Aesthetics Demo",
      slug: DEMO_BUSINESS_SLUG,
      websiteUrl: "https://demo.revnex.local",
      industry: "Medical Spa",
      timezone: "America/New_York"
    }
  });

  const owner = await prisma.user.upsert({
    where: {
      email: DEMO_OWNER_EMAIL
    },
    update: {
      businessId: business.id,
      clerkUserId: "user_demo_owner",
      firstName: "Taylor",
      lastName: "Reed",
      role: UserRole.OWNER,
      isActive: true
    },
    create: {
      businessId: business.id,
      clerkUserId: "user_demo_owner",
      email: DEMO_OWNER_EMAIL,
      firstName: "Taylor",
      lastName: "Reed",
      role: UserRole.OWNER,
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: {
      email: DEMO_ADMIN_EMAIL
    },
    update: {
      businessId: business.id,
      clerkUserId: "user_demo_ops",
      firstName: "Jordan",
      lastName: "Lane",
      role: UserRole.ADMIN,
      isActive: true
    },
    create: {
      businessId: business.id,
      clerkUserId: "user_demo_ops",
      email: DEMO_ADMIN_EMAIL,
      firstName: "Jordan",
      lastName: "Lane",
      role: UserRole.ADMIN,
      isActive: true
    }
  });

  const downtownLocation = await prisma.location.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "downtown-miami"
      }
    },
    update: {
      name: "Downtown Miami Flagship",
      bookingLink: "https://demo.revnex.local/book/downtown-miami",
      timezone: "America/New_York",
      addressLine1: "128 SE 1st Street",
      addressLine2: "Suite 400",
      city: "Miami",
      state: "FL",
      postalCode: "33131",
      country: "US",
      isActive: true
    },
    create: {
      businessId: business.id,
      name: "Downtown Miami Flagship",
      slug: "downtown-miami",
      bookingLink: "https://demo.revnex.local/book/downtown-miami",
      timezone: "America/New_York",
      addressLine1: "128 SE 1st Street",
      addressLine2: "Suite 400",
      city: "Miami",
      state: "FL",
      postalCode: "33131",
      country: "US",
      isActive: true
    }
  });

  const wynwoodLocation = await prisma.location.upsert({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug: "wynwood-studio"
      }
    },
    update: {
      name: "Wynwood Skin Studio",
      bookingLink: "https://demo.revnex.local/book/wynwood-studio",
      timezone: "America/New_York",
      addressLine1: "257 NW 24th Street",
      addressLine2: "Floor 2",
      city: "Miami",
      state: "FL",
      postalCode: "33127",
      country: "US",
      isActive: true
    },
    create: {
      businessId: business.id,
      name: "Wynwood Skin Studio",
      slug: "wynwood-studio",
      bookingLink: "https://demo.revnex.local/book/wynwood-studio",
      timezone: "America/New_York",
      addressLine1: "257 NW 24th Street",
      addressLine2: "Floor 2",
      city: "Miami",
      state: "FL",
      postalCode: "33127",
      country: "US",
      isActive: true
    }
  });

  const locationIds = [downtownLocation.id, wynwoodLocation.id];

  await prisma.appointment.deleteMany({
    where: {
      businessId: business.id
    }
  });

  await prisma.message.deleteMany({
    where: {
      businessId: business.id
    }
  });

  await prisma.call.deleteMany({
    where: {
      businessId: business.id
    }
  });

  await prisma.conversation.deleteMany({
    where: {
      businessId: business.id
    }
  });

  await prisma.lead.deleteMany({
    where: {
      businessId: business.id
    }
  });

  await prisma.chatbotSettings.deleteMany({
    where: {
      locationId: {
        in: locationIds
      }
    }
  });

  await prisma.missedCallRule.deleteMany({
    where: {
      locationId: {
        in: locationIds
      }
    }
  });

  await prisma.businessHours.deleteMany({
    where: {
      locationId: {
        in: locationIds
      }
    }
  });

  await prisma.phoneNumber.deleteMany({
    where: {
      businessId: business.id
    }
  });

  const downtownPhoneNumber = await prisma.phoneNumber.create({
    data: {
      businessId: business.id,
      locationId: downtownLocation.id,
      label: "Downtown Main Line",
      phoneNumber: "+13055550100",
      twilioSid: "PN_DEMO_DOWNTOWN_MAIN",
      voiceEnabled: true,
      smsEnabled: true,
      isPrimary: true
    }
  });

  const wynwoodPhoneNumber = await prisma.phoneNumber.create({
    data: {
      businessId: business.id,
      locationId: wynwoodLocation.id,
      label: "Wynwood Front Desk",
      phoneNumber: "+13055550101",
      twilioSid: "PN_DEMO_WYNWOOD_MAIN",
      voiceEnabled: true,
      smsEnabled: true,
      isPrimary: false
    }
  });

  const businessWidePhoneNumber = await prisma.phoneNumber.create({
    data: {
      businessId: business.id,
      locationId: null,
      label: "Corporate Demo Placeholder",
      phoneNumber: "+13055550109",
      twilioSid: "PN_DEMO_CORPORATE",
      voiceEnabled: true,
      smsEnabled: false,
      isPrimary: false
    }
  });

  await prisma.businessHours.createMany({
    data: [
      { locationId: downtownLocation.id, dayOfWeek: 0, opensAt: null, closesAt: null, isClosed: true },
      { locationId: downtownLocation.id, dayOfWeek: 1, opensAt: "08:30", closesAt: "18:30", isClosed: false },
      { locationId: downtownLocation.id, dayOfWeek: 2, opensAt: "08:30", closesAt: "18:30", isClosed: false },
      { locationId: downtownLocation.id, dayOfWeek: 3, opensAt: "08:30", closesAt: "18:30", isClosed: false },
      { locationId: downtownLocation.id, dayOfWeek: 4, opensAt: "08:30", closesAt: "18:30", isClosed: false },
      { locationId: downtownLocation.id, dayOfWeek: 5, opensAt: "08:30", closesAt: "18:00", isClosed: false },
      { locationId: downtownLocation.id, dayOfWeek: 6, opensAt: "09:00", closesAt: "14:00", isClosed: false },
      { locationId: wynwoodLocation.id, dayOfWeek: 0, opensAt: null, closesAt: null, isClosed: true },
      { locationId: wynwoodLocation.id, dayOfWeek: 1, opensAt: "10:00", closesAt: "19:00", isClosed: false },
      { locationId: wynwoodLocation.id, dayOfWeek: 2, opensAt: "10:00", closesAt: "19:00", isClosed: false },
      { locationId: wynwoodLocation.id, dayOfWeek: 3, opensAt: "10:00", closesAt: "19:00", isClosed: false },
      { locationId: wynwoodLocation.id, dayOfWeek: 4, opensAt: "10:00", closesAt: "19:00", isClosed: false },
      { locationId: wynwoodLocation.id, dayOfWeek: 5, opensAt: "10:00", closesAt: "18:00", isClosed: false },
      { locationId: wynwoodLocation.id, dayOfWeek: 6, opensAt: "10:00", closesAt: "16:00", isClosed: false }
    ]
  });

  await prisma.missedCallRule.createMany({
    data: [
      {
        locationId: downtownLocation.id,
        isEnabled: true,
        delaySeconds: 75,
        autoReplyText:
          "Thanks for calling Revnex Downtown. We missed your call, but reply here and our concierge team will text you back shortly.",
        sendAfterHoursReply: true,
        afterHoursReplyText:
          "Thanks for calling Revnex Downtown after hours. Reply here and we will follow up when the studio reopens."
      },
      {
        locationId: wynwoodLocation.id,
        isEnabled: true,
        delaySeconds: 90,
        autoReplyText:
          "Thanks for calling Revnex Wynwood. Our team missed you, but we can help by text right here.",
        sendAfterHoursReply: true,
        afterHoursReplyText:
          "Thanks for calling Revnex Wynwood after hours. Leave us a text and we will get back to you when we reopen."
      }
    ]
  });

  await prisma.chatbotSettings.createMany({
    data: [
      {
        locationId: downtownLocation.id,
        isEnabled: true,
        welcomeMessage: "Hi, welcome to Revnex Downtown. Are you looking to book, ask about pricing, or request a callback?",
        primaryColor: "#1d4f91",
        collectName: true,
        collectPhone: true,
        collectEmail: true,
        handoffMessage: "Thanks. A concierge specialist will follow up with you shortly."
      },
      {
        locationId: wynwoodLocation.id,
        isEnabled: false,
        welcomeMessage: "Hi, welcome to Revnex Wynwood. How can we help today?",
        primaryColor: "#0f766e",
        collectName: true,
        collectPhone: true,
        collectEmail: false,
        handoffMessage: "Thanks. Our studio team will follow up as soon as possible."
      }
    ]
  });

  const avaLead = await prisma.lead.create({
    data: {
      businessId: business.id,
      locationId: downtownLocation.id,
      sourceChannel: ConversationChannel.SMS,
      sourceDescription: "Missed call",
      firstName: "Ava",
      lastName: "Parker",
      phone: "+13055550199",
      email: "ava.parker@example.com",
      status: LeadStatus.NEW,
      notes: "Interested in a consultation and pricing for injectables.",
      tags: ["demo", "missed-call", "injectables"],
      smsOptedOut: false,
      createdAt: addHours(now, -3)
    }
  });

  const lucasLead = await prisma.lead.create({
    data: {
      businessId: business.id,
      locationId: wynwoodLocation.id,
      sourceChannel: ConversationChannel.SMS,
      sourceDescription: "Inbound SMS",
      firstName: "Lucas",
      lastName: "Bennett",
      phone: "+13055550198",
      email: "lucas.bennett@example.com",
      status: LeadStatus.CONTACTED,
      notes: "Asked about membership pricing and weekday availability.",
      tags: ["demo", "membership"],
      smsOptedOut: false,
      lastContactedAt: addMinutes(now, -85),
      createdAt: addHours(now, -26)
    }
  });

  const mayaLead = await prisma.lead.create({
    data: {
      businessId: business.id,
      locationId: downtownLocation.id,
      sourceChannel: ConversationChannel.SMS,
      sourceDescription: "Booked consultation",
      firstName: "Maya",
      lastName: "Chen",
      phone: "+13055550197",
      email: "maya.chen@example.com",
      status: LeadStatus.BOOKED,
      notes: "Booked for skin consultation after missed-call follow-up.",
      tags: ["demo", "booked", "skin"],
      smsOptedOut: false,
      lastContactedAt: addHours(now, -18),
      convertedAt: addHours(now, -16),
      createdAt: addDays(now, -2)
    }
  });

  const avaConversation = await prisma.conversation.create({
    data: {
      businessId: business.id,
      locationId: downtownLocation.id,
      leadId: avaLead.id,
      channel: ConversationChannel.SMS,
      subject: "Downtown missed-call follow-up",
      isOpen: true,
      externalThreadId: "sms:downtown-main:+13055550199",
      metadata: {
        automationSource: "missed_call",
        locationSlug: "downtown-miami"
      },
      lastMessageAt: addMinutes(now, -35),
      createdAt: addHours(now, -3)
    }
  });

  const lucasConversation = await prisma.conversation.create({
    data: {
      businessId: business.id,
      locationId: wynwoodLocation.id,
      leadId: lucasLead.id,
      channel: ConversationChannel.SMS,
      subject: "Wynwood pricing inquiry",
      isOpen: true,
      externalThreadId: "sms:wynwood-main:+13055550198",
      metadata: {
        automationSource: "keyword_reply",
        locationSlug: "wynwood-studio"
      },
      lastMessageAt: addHours(now, -20),
      createdAt: addHours(now, -26)
    }
  });

  const mayaConversation = await prisma.conversation.create({
    data: {
      businessId: business.id,
      locationId: downtownLocation.id,
      leadId: mayaLead.id,
      channel: ConversationChannel.SMS,
      subject: "Booked consultation follow-up",
      isOpen: false,
      externalThreadId: "sms:downtown-main:+13055550197",
      metadata: {
        automationSource: "booking_followup",
        locationSlug: "downtown-miami"
      },
      lastMessageAt: addHours(now, -18),
      createdAt: addDays(now, -2)
    }
  });

  await prisma.message.createMany({
    data: [
      {
        businessId: business.id,
        locationId: downtownLocation.id,
        leadId: avaLead.id,
        conversationId: avaConversation.id,
        phoneNumberId: downtownPhoneNumber.id,
        channel: ConversationChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        body: "Thanks for calling Revnex Downtown. We missed your call. What can we help you book today?",
        fromAddress: downtownPhoneNumber.phoneNumber,
        toAddress: avaLead.phone,
        providerMessageId: "SM_DEMO_DOWNTOWN_001",
        metadata: {
          automated: true,
          automationType: "missed_call"
        },
        sentAt: addMinutes(now, -42),
        createdAt: addMinutes(now, -42)
      },
      {
        businessId: business.id,
        locationId: downtownLocation.id,
        leadId: avaLead.id,
        conversationId: avaConversation.id,
        phoneNumberId: downtownPhoneNumber.id,
        channel: ConversationChannel.SMS,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.RECEIVED,
        body: "Can someone text me pricing for lip filler and earliest availability?",
        fromAddress: avaLead.phone,
        toAddress: downtownPhoneNumber.phoneNumber,
        providerMessageId: "SM_DEMO_DOWNTOWN_002",
        metadata: {
          keyword: null
        },
        sentAt: addMinutes(now, -35),
        createdAt: addMinutes(now, -35)
      },
      {
        businessId: business.id,
        locationId: wynwoodLocation.id,
        leadId: lucasLead.id,
        conversationId: lucasConversation.id,
        phoneNumberId: wynwoodPhoneNumber.id,
        channel: ConversationChannel.SMS,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.RECEIVED,
        body: "Do you have membership pricing and evening appointments this week?",
        fromAddress: lucasLead.phone,
        toAddress: wynwoodPhoneNumber.phoneNumber,
        providerMessageId: "SM_DEMO_WYNWOOD_001",
        metadata: {
          keyword: "pricing"
        },
        sentAt: addHours(now, -20),
        createdAt: addHours(now, -20)
      },
      {
        businessId: business.id,
        locationId: wynwoodLocation.id,
        leadId: lucasLead.id,
        conversationId: lucasConversation.id,
        phoneNumberId: wynwoodPhoneNumber.id,
        channel: ConversationChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        body: "Yes. We offer monthly memberships and have Thursday evening openings. Want the booking link?",
        fromAddress: wynwoodPhoneNumber.phoneNumber,
        toAddress: lucasLead.phone,
        providerMessageId: "SM_DEMO_WYNWOOD_002",
        metadata: {
          automated: false,
          sender: "demo_team"
        },
        sentAt: addHours(now, -19),
        createdAt: addHours(now, -19)
      },
      {
        businessId: business.id,
        locationId: downtownLocation.id,
        leadId: mayaLead.id,
        conversationId: mayaConversation.id,
        phoneNumberId: downtownPhoneNumber.id,
        channel: ConversationChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        body: "You're confirmed for Friday at 11:30 AM. Reply here if you need to reschedule.",
        fromAddress: downtownPhoneNumber.phoneNumber,
        toAddress: mayaLead.phone,
        providerMessageId: "SM_DEMO_DOWNTOWN_003",
        metadata: {
          automationType: "booking_confirmation"
        },
        sentAt: addHours(now, -18),
        createdAt: addHours(now, -18)
      }
    ]
  });

  await prisma.call.createMany({
    data: [
      {
        businessId: business.id,
        locationId: downtownLocation.id,
        leadId: avaLead.id,
        phoneNumberId: downtownPhoneNumber.id,
        providerCallId: "CA_DEMO_DOWNTOWN_001",
        fromPhone: avaLead.phone ?? "+13055550199",
        toPhone: downtownPhoneNumber.phoneNumber,
        status: CallStatus.MISSED,
        durationSeconds: 0,
        metadata: {
          answeredBy: null,
          source: "demo_seed"
        },
        smsSent: true,
        smsSentAt: addMinutes(now, -42),
        missedAt: addMinutes(now, -43),
        automationStatus: "sent",
        receivedAt: addMinutes(now, -44),
        endedAt: addMinutes(now, -43),
        createdAt: addMinutes(now, -44)
      },
      {
        businessId: business.id,
        locationId: downtownLocation.id,
        leadId: mayaLead.id,
        phoneNumberId: downtownPhoneNumber.id,
        providerCallId: "CA_DEMO_DOWNTOWN_002",
        fromPhone: mayaLead.phone ?? "+13055550197",
        toPhone: downtownPhoneNumber.phoneNumber,
        status: CallStatus.ANSWERED,
        durationSeconds: 382,
        metadata: {
          answeredBy: "human",
          source: "demo_seed"
        },
        smsSent: false,
        missedAt: null,
        automationStatus: "not_missed",
        receivedAt: addHours(now, -17),
        endedAt: addHours(now, -16),
        createdAt: addHours(now, -17)
      },
      {
        businessId: business.id,
        locationId: wynwoodLocation.id,
        leadId: lucasLead.id,
        phoneNumberId: wynwoodPhoneNumber.id,
        providerCallId: "CA_DEMO_WYNWOOD_001",
        fromPhone: lucasLead.phone ?? "+13055550198",
        toPhone: wynwoodPhoneNumber.phoneNumber,
        status: CallStatus.MISSED,
        durationSeconds: 0,
        metadata: {
          answeredBy: null,
          source: "demo_seed"
        },
        smsSent: true,
        smsSentAt: addHours(now, -22),
        missedAt: addHours(now, -22),
        automationStatus: "sent",
        receivedAt: addHours(now, -22),
        endedAt: addHours(now, -22),
        createdAt: addHours(now, -22)
      }
    ]
  });

  await prisma.appointment.createMany({
    data: [
      {
        businessId: business.id,
        locationId: downtownLocation.id,
        leadId: mayaLead.id,
        conversationId: mayaConversation.id,
        status: AppointmentStatus.SCHEDULED,
        title: "Skin Consultation",
        description: "Demo appointment for dashboard walkthrough.",
        startsAt: addDays(now, 2),
        endsAt: addDays(now, 2.02)
      },
      {
        businessId: business.id,
        locationId: wynwoodLocation.id,
        leadId: lucasLead.id,
        conversationId: lucasConversation.id,
        status: AppointmentStatus.CONFIRMED,
        title: "Membership Tour",
        description: "Short tour and pricing review.",
        startsAt: addDays(now, 4),
        endsAt: addDays(now, 4.03)
      }
    ]
  });

  console.log(
    JSON.stringify(
      {
        seeded: true,
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug
        },
        users: [owner.email, DEMO_ADMIN_EMAIL],
        locations: [
          {
            id: downtownLocation.id,
            name: downtownLocation.name,
            phoneNumber: downtownPhoneNumber.phoneNumber
          },
          {
            id: wynwoodLocation.id,
            name: wynwoodLocation.name,
            phoneNumber: wynwoodPhoneNumber.phoneNumber
          }
        ],
        businessWidePhoneNumber: businessWidePhoneNumber.phoneNumber,
        demoSummary: {
          leads: 3,
          calls: 3,
          conversations: 3,
          messages: 5,
          appointments: 2
        }
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
