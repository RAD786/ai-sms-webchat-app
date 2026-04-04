export enum ChannelType {
  MISSED_CALL_SMS = "MISSED_CALL_SMS",
  WEBSITE_CHATBOT = "WEBSITE_CHATBOT"
}

export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  CONVERTED = "CONVERTED",
  LOST = "LOST"
}

export enum MessageDirection {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  SYSTEM = "SYSTEM"
}

export type MessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED";
export type CallStatus = "RINGING" | "MISSED" | "ANSWERED" | "VOICEMAIL";

export type BusinessContext = {
  businessId: string;
  locationId?: string;
  clerkUserId: string;
};

export type LeadSummary = {
  id: string;
  phone: string;
  status: LeadStatus;
  sourceChannel?: ChannelType;
};
