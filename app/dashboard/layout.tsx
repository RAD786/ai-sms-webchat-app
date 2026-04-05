import { ReactNode } from "react";
import type { Route } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const user = await currentUser();

  return (
    <AppShell
      user={{
        name:
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.primaryEmailAddress?.emailAddress ||
          "Team member",
        email: user?.primaryEmailAddress?.emailAddress ?? ""
      }}
    >
      {children}
    </AppShell>
  );
}
