import "server-only";

import { prisma } from "@/lib/prisma";

export class ChatbotConfigService {
  static async getBusinessLocationSettings(businessId: string) {
    return prisma.location.findMany({
      where: {
        businessId
      },
      orderBy: {
        name: "asc"
      },
      include: {
        chatbotSettings: true
      }
    });
  }
}

