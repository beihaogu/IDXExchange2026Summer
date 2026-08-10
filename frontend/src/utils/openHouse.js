// OpenHouseDate arrives as a MySQL DATE serialized to midnight UTC
// ("2026-06-16T00:00:00.000Z"). Formatting it in the browser's local
// timezone would roll it back a day for anyone west of UTC, so the date is
// always read out in UTC.
export function formatOpenHouseDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// MySQL TIME columns arrive as plain "HH:MM:SS" strings -- parsed directly
// rather than routed through Date to avoid a timezone conversion.
export function formatOpenHouseTime(timeString) {
  if (!timeString) return "";
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

// all_data is a JSON blob stored as text; OpenHouseRemarks lives inside it
// rather than as its own column, so it has to be parsed out here.
export function parseOpenHouseRemarks(allData) {
  if (!allData) return null;
  try {
    const parsed = JSON.parse(allData);
    return parsed.OpenHouseRemarks || null;
  } catch {
    return null;
  }
}
