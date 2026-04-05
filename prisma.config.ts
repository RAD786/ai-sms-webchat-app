import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma config files do not auto-load .env files, so load local envs explicitly.
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
