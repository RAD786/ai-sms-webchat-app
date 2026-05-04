CREATE TABLE "public"."DiagnosticEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "locationId" TEXT,
    "category" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "providerCallId" TEXT,
    "providerMessageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiagnosticEvent_businessId_createdAt_idx" ON "public"."DiagnosticEvent"("businessId", "createdAt");
CREATE INDEX "DiagnosticEvent_eventType_createdAt_idx" ON "public"."DiagnosticEvent"("eventType", "createdAt");
CREATE INDEX "DiagnosticEvent_category_createdAt_idx" ON "public"."DiagnosticEvent"("category", "createdAt");
CREATE INDEX "DiagnosticEvent_locationId_createdAt_idx" ON "public"."DiagnosticEvent"("locationId", "createdAt");

ALTER TABLE "public"."DiagnosticEvent"
ADD CONSTRAINT "DiagnosticEvent_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."DiagnosticEvent"
ADD CONSTRAINT "DiagnosticEvent_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
