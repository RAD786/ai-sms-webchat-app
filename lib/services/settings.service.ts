export class SettingsService {
  static async getBusinessDefaults(businessId: string) {
    void businessId;

    // TODO: Pull tenant-wide defaults from the BusinessSetting table.
    return {
      replyWindowMinutes: 5,
      missedCallAutoReplyTemplate:
        "Thanks for calling Revnex. We missed your call but can help by text."
    };
  }
}

