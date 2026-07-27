import { fetchProperties } from "./client";

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
