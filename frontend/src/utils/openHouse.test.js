import { formatOpenHouseDate, formatOpenHouseTime, parseOpenHouseRemarks } from "./openHouse";

describe("formatOpenHouseDate", () => {
  // The API serializes the DATE column to midnight UTC. Formatting in local
  // time would show June 15 to anyone west of UTC, so this must stay in UTC.
  it("formats the API's midnight-UTC date without shifting the day", () => {
    expect(formatOpenHouseDate("2026-06-16T00:00:00.000Z")).toBe("Tue, Jun 16, 2026");
  });

  it("returns an empty string for missing or unparseable dates", () => {
    expect(formatOpenHouseDate(null)).toBe("");
    expect(formatOpenHouseDate("")).toBe("");
    expect(formatOpenHouseDate("not a date")).toBe("");
  });
});

describe("formatOpenHouseTime", () => {
  it("formats a MySQL TIME string as 12-hour with a period", () => {
    expect(formatOpenHouseTime("09:00:00")).toBe("9:00 AM");
    expect(formatOpenHouseTime("14:30:00")).toBe("2:30 PM");
    expect(formatOpenHouseTime("23:00:00")).toBe("11:00 PM");
  });

  it("renders midnight and noon as 12, not 0", () => {
    expect(formatOpenHouseTime("00:00:00")).toBe("12:00 AM");
    expect(formatOpenHouseTime("12:00:00")).toBe("12:00 PM");
  });

  it("returns an empty string for missing or malformed times", () => {
    expect(formatOpenHouseTime(null)).toBe("");
    expect(formatOpenHouseTime("")).toBe("");
    expect(formatOpenHouseTime("abc")).toBe("");
  });
});

// Debug Challenge: remarks never appeared because OpenHouseRemarks is not a
// column -- it lives inside the all_data JSON blob and needs a second parse.
describe("parseOpenHouseRemarks", () => {
  it("pulls OpenHouseRemarks out of the all_data JSON blob", () => {
    const allData = JSON.stringify({
      OpenHouseId: "153352801",
      OpenHouseRemarks: "This Beautiful Family Home is Move In Ready",
      Refreshments: null,
    });

    expect(parseOpenHouseRemarks(allData)).toBe("This Beautiful Family Home is Move In Ready");
  });

  it("returns null when the blob has no remarks", () => {
    expect(parseOpenHouseRemarks(JSON.stringify({ OpenHouseRemarks: null }))).toBeNull();
    expect(parseOpenHouseRemarks(JSON.stringify({ OpenHouseId: "1" }))).toBeNull();
  });

  it("returns null instead of throwing on missing or malformed JSON", () => {
    expect(parseOpenHouseRemarks(null)).toBeNull();
    expect(parseOpenHouseRemarks("")).toBeNull();
    expect(parseOpenHouseRemarks("{broken")).toBeNull();
  });
});
