import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getDayOfWeekInTimeZone,
  getTimeInTimeZone,
  isTimeWithinRange
} from "@/lib/utils/date-time";

export type BusinessHoursWindow = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

export type BusinessHoursStatus = {
  isOpen: boolean;
  timezone: string;
  currentDayOfWeek: number;
  currentTime: string;
  activeWindow: BusinessHoursWindow | null;
};

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDisplayTime(value: string) {
  const [hoursText, minutes] = value.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${normalizedHours}:${minutes} ${suffix}`;
}

export class BusinessHoursService {
  static async getLocationHours(locationId: string) {
    const location = await prisma.location.findUnique({
      where: {
        id: locationId
      },
      select: {
        timezone: true,
        businessHours: {
          orderBy: {
            dayOfWeek: "asc"
          },
          select: {
            dayOfWeek: true,
            opensAt: true,
            closesAt: true,
            isClosed: true
          }
        }
      }
    });

    if (!location) {
      throw new Error("Location not found.");
    }

    return location;
  }

  static isOpenAt(args: {
    hours: BusinessHoursWindow[];
    timezone: string;
    at?: Date;
  }): BusinessHoursStatus {
    const at = args.at ?? new Date();
    const currentDayOfWeek = getDayOfWeekInTimeZone(at, args.timezone);
    const currentTime = getTimeInTimeZone(at, args.timezone);
    const activeWindow =
      args.hours.find((window) => window.dayOfWeek === currentDayOfWeek) ?? null;

    if (
      !activeWindow ||
      activeWindow.isClosed ||
      !activeWindow.opensAt ||
      !activeWindow.closesAt
    ) {
      return {
        isOpen: false,
        timezone: args.timezone,
        currentDayOfWeek,
        currentTime,
        activeWindow
      };
    }

    return {
      isOpen: isTimeWithinRange(currentTime, activeWindow.opensAt, activeWindow.closesAt),
      timezone: args.timezone,
      currentDayOfWeek,
      currentTime,
      activeWindow
    };
  }

  static async getOpenStatusForLocation(locationId: string, at = new Date()) {
    const location = await this.getLocationHours(locationId);

    return this.isOpenAt({
      hours: location.businessHours,
      timezone: location.timezone,
      at
    });
  }

  static formatHoursForDay(window: BusinessHoursWindow | null, dayOfWeek: number) {
    if (!window || window.isClosed || !window.opensAt || !window.closesAt) {
      return `${DAY_LABELS[dayOfWeek]}: Closed`;
    }

    return `${DAY_LABELS[dayOfWeek]}: ${formatDisplayTime(window.opensAt)} - ${formatDisplayTime(window.closesAt)}`;
  }
}
