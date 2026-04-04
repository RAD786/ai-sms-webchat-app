import { ChannelType, type CallStatus } from "@/types/domain";

export type CreateCallRecordInput = {
  businessId: string;
  locationId?: string;
  leadId?: string;
  fromPhone: string;
  toPhone: string;
  twilioCallSid?: string;
  status: CallStatus;
  sourceChannel: ChannelType;
};

export class CallsService {
  static async createRecord(input: CreateCallRecordInput) {
    void input;

    // TODO: Persist call records through Prisma once feature logic is implemented.
    return {
      ok: true
    };
  }
}

