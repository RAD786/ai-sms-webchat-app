import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DiagnosticLevel = "info" | "warning" | "error";

type DiagnosticRecordInput = {
  businessId?: string | null;
  locationId?: string | null;
  category: string;
  eventType: string;
  level?: DiagnosticLevel;
  message: string;
  fromPhone?: string | null;
  toPhone?: string | null;
  providerCallId?: string | null;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
};

function toInputJsonValue(value?: Record<string, unknown>) {
  return value ? (value as Prisma.InputJsonValue) : undefined;
}

export class DiagnosticsService {
  static async record(input: DiagnosticRecordInput) {
    const level = input.level ?? "info";
    const consolePayload = {
      businessId: input.businessId ?? null,
      locationId: input.locationId ?? null,
      category: input.category,
      eventType: input.eventType,
      fromPhone: input.fromPhone ?? null,
      toPhone: input.toPhone ?? null,
      providerCallId: input.providerCallId ?? null,
      providerMessageId: input.providerMessageId ?? null,
      ...(input.metadata ?? {})
    };

    if (level === "error") {
      console.error("[diagnostics]", input.message, consolePayload);
    } else if (level === "warning") {
      console.warn("[diagnostics]", input.message, consolePayload);
    } else {
      console.info("[diagnostics]", input.message, consolePayload);
    }

    try {
      await prisma.diagnosticEvent.create({
        data: {
          businessId: input.businessId ?? null,
          locationId: input.locationId ?? null,
          category: input.category,
          eventType: input.eventType,
          level,
          message: input.message,
          fromPhone: input.fromPhone ?? null,
          toPhone: input.toPhone ?? null,
          providerCallId: input.providerCallId ?? null,
          providerMessageId: input.providerMessageId ?? null,
          metadata: toInputJsonValue(input.metadata)
        }
      });
    } catch (error) {
      console.error("[diagnostics]", "Failed to persist diagnostic event", {
        eventType: input.eventType,
        category: input.category,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
