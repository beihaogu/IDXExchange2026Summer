import { fetchProperties, fetchProperty, fetchOpenHouses } from "./client";

// fetch() is a browser API that jsdom does not implement, and even if it did we
// do not want the tests to depend on a running backend. jest.fn() replaces it
// with a stub whose return value each test controls.
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

describe("fetchProperties", () => {
  it("requests /api/properties and returns the parsed body", async () => {
    const payload = { total: 1, limit: 20, offset: 0, results: [{ L_ListingID: "1" }] };
    global.fetch.mockResolvedValue(jsonResponse(payload));

    await expect(fetchProperties()).resolves.toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith("/api/properties");
  });

  it("builds a query string from the filters and omits empty values", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ total: 0, results: [] }));

    await fetchProperties({
      city: "Portland",
      zipcode: "",
      minPrice: 100000,
      maxPrice: undefined,
      beds: "3",
      baths: null,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/properties?city=Portland&minPrice=100000&beds=3"
    );
  });

  it("throws the API error message when the response is not ok", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse({ error: "Invalid query parameters" }, { ok: false, status: 400 })
    );

    await expect(fetchProperties({ minPrice: 500 })).rejects.toThrow("Invalid query parameters");
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    await expect(fetchProperties()).rejects.toThrow("Failed to fetch properties (HTTP 500)");
  });

  it("throws a friendly message when the network request fails", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchProperties()).rejects.toThrow(
      "Unable to reach the server. Is the backend running?"
    );
  });
});

describe("fetchProperty", () => {
  it("requests the single-property route and returns the parsed body", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ L_ListingID: "1077426281" }));

    await expect(fetchProperty("1077426281")).resolves.toEqual({ L_ListingID: "1077426281" });
    expect(global.fetch).toHaveBeenCalledWith("/api/properties/1077426281");
  });

  // Ids come straight out of the URL, so anything path-breaking has to be
  // escaped rather than concatenated in raw.
  it("escapes the id before putting it in the path", async () => {
    global.fetch.mockResolvedValue(jsonResponse({}));

    await fetchProperty("a/b?c");

    expect(global.fetch).toHaveBeenCalledWith("/api/properties/a%2Fb%3Fc");
  });

  it("throws the API error message for an unknown id", async () => {
    global.fetch.mockResolvedValue(
      jsonResponse({ error: "No property found with id nope" }, { ok: false, status: 404 })
    );

    await expect(fetchProperty("nope")).rejects.toThrow("No property found with id nope");
  });

  it("throws a friendly message when the network request fails", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchProperty("1")).rejects.toThrow(
      "Unable to reach the server. Is the backend running?"
    );
  });
});

describe("fetchOpenHouses", () => {
  it("requests the nested open house route and returns the parsed body", async () => {
    global.fetch.mockResolvedValue(jsonResponse([{ OH_StartTime: "09:00:00" }]));

    await expect(fetchOpenHouses("1077426281")).resolves.toEqual([{ OH_StartTime: "09:00:00" }]);
    expect(global.fetch).toHaveBeenCalledWith("/api/properties/1077426281/openhouses");
  });

  it("treats an empty list as a valid result, not an error", async () => {
    global.fetch.mockResolvedValue(jsonResponse([]));

    await expect(fetchOpenHouses("1077426281")).resolves.toEqual([]);
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    });

    await expect(fetchOpenHouses("1")).rejects.toThrow("Failed to fetch open houses (HTTP 500)");
  });
});
