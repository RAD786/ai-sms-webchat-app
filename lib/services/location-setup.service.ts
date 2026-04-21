import "server-only";

type SetupPhoneNumber = {
  id: string;
  label: string | null;
  phoneNumber: string;
  smsEnabled: boolean;
  voiceEnabled: boolean;
  isPrimary: boolean;
};

type SetupBusinessHours = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

type SetupMissedCallRule = {
  isEnabled: boolean;
  autoReplyText: string;
  sendAfterHoursReply: boolean;
  afterHoursReplyText: string | null;
};

type SetupLocation = {
  id: string;
  name: string;
  isActive: boolean;
  bookingLink: string | null;
  phoneNumbers: SetupPhoneNumber[];
  businessHours: SetupBusinessHours[];
  missedCallRule: SetupMissedCallRule | null;
};

export type LocationSetupChecklistItem = {
  key: string;
  label: string;
  complete: boolean;
  helpText: string;
};

export type LocationSetupState = {
  locationId: string;
  locationName: string;
  assignedPhoneNumber: SetupPhoneNumber | null;
  completedCount: number;
  totalCount: number;
  isReady: boolean;
  missedCallTextingEnabled: boolean;
  checklist: LocationSetupChecklistItem[];
  alerts: string[];
};

function hasHoursConfigured(hours: SetupBusinessHours[]) {
  return hours.some((entry) => !entry.isClosed && Boolean(entry.opensAt) && Boolean(entry.closesAt));
}

function hasMessageTemplateConfigured(rule: SetupMissedCallRule | null) {
  if (!rule || !rule.autoReplyText.trim()) {
    return false;
  }

  if (rule.sendAfterHoursReply) {
    return Boolean(rule.afterHoursReplyText?.trim());
  }

  return true;
}

function selectAssignedPhoneNumber(phoneNumbers: SetupPhoneNumber[]) {
  return (
    [...phoneNumbers].sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      if (left.voiceEnabled !== right.voiceEnabled) {
        return left.voiceEnabled ? -1 : 1;
      }

      if (left.smsEnabled !== right.smsEnabled) {
        return left.smsEnabled ? -1 : 1;
      }

      return left.phoneNumber.localeCompare(right.phoneNumber);
    })[0] ?? null
  );
}

export class LocationSetupService {
  static getSetupState(location: SetupLocation): LocationSetupState {
    const assignedPhoneNumber = selectAssignedPhoneNumber(location.phoneNumbers);
    const hasBusinessHours = hasHoursConfigured(location.businessHours);
    const hasMessageTemplate = hasMessageTemplateConfigured(location.missedCallRule);
    const hasBookingLink = Boolean(location.bookingLink?.trim());
    const checklist: LocationSetupChecklistItem[] = [
      {
        key: "phone-number",
        label: "Twilio number assigned",
        complete: Boolean(assignedPhoneNumber),
        helpText:
          "Save the live Twilio number in E.164 format and assign it to this location so inbound calls can be matched correctly."
      },
      {
        key: "business-hours",
        label: "Business hours set",
        complete: hasBusinessHours,
        helpText:
          "Add at least one open day with start and end times so the platform can decide between business-hours and after-hours behavior."
      },
      {
        key: "message-template",
        label: "Message template set",
        complete: hasMessageTemplate,
        helpText:
          "Set the missed-call reply template. If after-hours texting is enabled, the after-hours template must also be filled in."
      },
      {
        key: "location-active",
        label: "Location active",
        complete: location.isActive,
        helpText:
          "Inactive locations should not be treated as live routing destinations for calls and messages."
      },
      {
        key: "booking-link",
        label: "Booking link set",
        complete: hasBookingLink,
        helpText:
          "Save the direct scheduling URL used in keyword replies and admin setup checks."
      }
    ];

    const missedCallTextingEnabled = Boolean(
      assignedPhoneNumber?.smsEnabled && location.missedCallRule?.isEnabled
    );
    const alerts = checklist
      .filter((item) => !item.complete)
      .map((item) => item.helpText);

    if (assignedPhoneNumber && !assignedPhoneNumber.voiceEnabled) {
      alerts.push(
        "The assigned number is marked voice-disabled. Twilio can still hit the webhook, but this dashboard record is not configured as a live voice line."
      );
    }

    if (assignedPhoneNumber && !assignedPhoneNumber.smsEnabled) {
      alerts.push(
        "The assigned number is not SMS-enabled, so missed-call texts and keyword replies cannot send from this line."
      );
    }

    if (location.missedCallRule && !location.missedCallRule.isEnabled) {
      alerts.push(
        "Missed-call texting is disabled for this location. Calls can still log, but automated follow-up texts will not send."
      );
    }

    if (!hasBusinessHours) {
      alerts.push(
        "Without business hours, the system treats the location as closed. Only the after-hours reply can be used."
      );
    }

    const completedCount = checklist.filter((item) => item.complete).length;

    return {
      locationId: location.id,
      locationName: location.name,
      assignedPhoneNumber,
      completedCount,
      totalCount: checklist.length,
      isReady: completedCount === checklist.length,
      missedCallTextingEnabled,
      checklist,
      alerts: Array.from(new Set(alerts))
    };
  }

  static summarize(states: LocationSetupState[]) {
    return {
      totalLocations: states.length,
      readyLocations: states.filter((state) => state.isReady).length,
      locationsWithAssignedNumber: states.filter((state) => state.assignedPhoneNumber).length,
      locationsWithMissedCallTextingEnabled: states.filter((state) => state.missedCallTextingEnabled)
        .length
    };
  }
}
