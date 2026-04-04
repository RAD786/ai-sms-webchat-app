function getDateTimeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getParts(date: Date, timeZone: string) {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    weekday: map.weekday,
    hour: map.hour,
    minute: map.minute
  };
}

export function getTimeInTimeZone(date: Date, timeZone: string) {
  const parts = getParts(date, timeZone);

  return `${parts.hour}:${parts.minute}`;
}

export function getDayOfWeekInTimeZone(date: Date, timeZone: string) {
  const weekday = getParts(date, timeZone).weekday;
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return dayMap[weekday] ?? 0;
}

export function isTimeWithinRange(current: string, start: string, end: string) {
  // Stored business-hour values use zero-padded HH:mm strings, so lexical comparison is safe.
  return current >= start && current <= end;
}

export function getNowInTimeZone(timeZone: string) {
  const now = new Date();

  return {
    timeZone,
    dayOfWeek: getDayOfWeekInTimeZone(now, timeZone),
    time: getTimeInTimeZone(now, timeZone),
    date: now
  };
}
