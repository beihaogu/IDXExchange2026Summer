import { parsePhotos } from "./photos";

describe("parsePhotos", () => {
  it("parses a JSON array of photo URLs", () => {
    const raw = JSON.stringify(["https://example.com/1.jpg", "https://example.com/2.jpg"]);

    expect(parsePhotos(raw)).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
  });

  it("returns an empty array when the column is null or empty", () => {
    expect(parsePhotos(null)).toEqual([]);
    expect(parsePhotos(undefined)).toEqual([]);
    expect(parsePhotos("")).toEqual([]);
  });

  // Real rows have been seen with truncated JSON; a throw here would take the
  // whole card down, so the parse has to fail closed.
  it("returns an empty array instead of throwing on malformed JSON", () => {
    expect(parsePhotos('["https://example.com/1.jpg"')).toEqual([]);
    expect(parsePhotos("not json at all")).toEqual([]);
  });

  it("returns an empty array when the JSON is valid but not an array", () => {
    expect(parsePhotos('{"url":"https://example.com/1.jpg"}')).toEqual([]);
  });

  it("drops null entries inside the array", () => {
    expect(parsePhotos('["https://example.com/1.jpg", null, ""]')).toEqual([
      "https://example.com/1.jpg",
    ]);
  });
});
