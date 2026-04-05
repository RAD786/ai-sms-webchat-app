import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function toPlatformUser(user: PlatformUser) {
  return user;
}

async function linkUserByEmail(clerkUserId: string, email: string, firstName?: string | null, lastName?: string | null) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email
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

  if (!existingUser) {
    return null;
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: existingUser.id
    },
    data: {
      clerkUserId,
      isActive: true,
      firstName: existingUser.firstName ?? firstName ?? null,
      lastName: existingUser.lastName ?? lastName ?? null
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

  return toPlatformUser(updatedUser);
}

async function provisionDevelopmentUser(clerkUserId: string, email: string, firstName?: string | null, lastName?: string | null) {
  const existingBusiness = await prisma.business.findFirst({
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true
    }
  });

  const business =
    existingBusiness ??
    (await prisma.business.create({
      data: {
        name: "Revnex Demo Business",
        slug: `${slugify(email.split("@")[0] || "revnex-demo")}-${Date.now().toString().slice(-5)}`,
        timezone: "America/New_York"
      },
      select: {
        id: true
      }
    }));

  const createdUser = await prisma.user.create({
    data: {
      clerkUserId,
      businessId: business.id,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role: UserRole.OWNER,
      isActive: true
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

  return toPlatformUser(createdUser);
}

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

  if (user?.isActive) {
    return user;
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();

  if (!email) {
    throw new Error("Signed-in Clerk user is missing a primary email address.");
  }

  const linkedUser = await linkUserByEmail(
    clerkUserId,
    email,
    clerkUser?.firstName ?? null,
    clerkUser?.lastName ?? null
  );

  if (linkedUser?.isActive) {
    return linkedUser;
  }

  if (process.env.NODE_ENV === "development") {
    return provisionDevelopmentUser(
      clerkUserId,
      email,
      clerkUser?.firstName ?? null,
      clerkUser?.lastName ?? null
    );
  }

  throw new Error("No active platform membership found for this Clerk account.");
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
