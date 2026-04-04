import "server-only";

import { auth } from "@clerk/nextjs/server";
import { UserRole, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BusinessAccessContext = {
  clerkUserId: string;
  userId: string;
  businessId: string;
  role: UserRole;
};

type PlatformUser = Pick<
  User,
  "id" | "businessId" | "clerkUserId" | "role" | "isActive" | "email" | "firstName" | "lastName"
>;

export async function requireClerkUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Authentication required.");
  }

  return userId;
}

export async function requirePlatformUser(): Promise<PlatformUser> {
  const clerkUserId = await requireClerkUserId();

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId
    },
    select: {
      id: true,
      businessId: true,
      clerkUserId: true,
      role: true,
      isActive: true,
      email: true,
      firstName: true,
      lastName: true
    }
  });

  if (!user || !user.isActive) {
    throw new Error("Active platform user not found.");
  }

  return user;
}

export async function requireBusinessAccess(): Promise<BusinessAccessContext> {
  const user = await requirePlatformUser();

  return {
    clerkUserId: user.clerkUserId,
    userId: user.id,
    businessId: user.businessId,
    role: user.role
  };
}

export async function assertLocationAccess(locationId: string, businessId: string) {
  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      businessId
    },
    select: {
      id: true,
      businessId: true,
      timezone: true,
      name: true
    }
  });

  if (!location) {
    throw new Error("Location not found for this business.");
  }

  return location;
}

