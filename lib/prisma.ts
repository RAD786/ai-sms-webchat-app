import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const directUrl = process.env.DIRECT_URL ?? "";

  if (process.env.NODE_ENV !== "production") {
    if (databaseUrl.includes("pooler.supabase.com") && !databaseUrl.includes("pgbouncer=true")) {
      console.warn(
        "[prisma]",
        "DATABASE_URL appears to use the Supabase pooler without `pgbouncer=true`. Recopy the pooled connection string from Supabase."
      );
    }

    if (directUrl.includes("pooler.supabase.com")) {
      console.warn(
        "[prisma]",
        "DIRECT_URL is pointing at the Supabase pooler host. DIRECT_URL should use the direct database host like `db.<project-ref>.supabase.co:5432`."
      );
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

// Prevent exhausting database connections during local hot reloads.
export const prisma = globalThis.__prisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}

export default prisma;
