import { ReactNode } from "react";
import type { Route } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";
import { requirePlatformUser } from "@/lib/auth";

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const [user, platformUser] = await Promise.all([currentUser(), requirePlatformUser()]);
  const isAdmin = ([UserRole.OWNER, UserRole.ADMIN] as UserRole[]).includes(platformUser.role);

  return (
    <AppShell
      user={{
        name:
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.primaryEmailAddress?.emailAddress ||
          "Team member",
        email: user?.primaryEmailAddress?.emailAddress ?? ""
      }}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
