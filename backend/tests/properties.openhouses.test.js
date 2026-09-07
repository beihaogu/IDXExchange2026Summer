jest.mock("../db/pool", () => ({ query: jest.fn() }));

const request = require("supertest");
const app = require("../server");
const { pool, rows, sqlOf, valuesOf } = require("./helpers/mockPool");
const { openHouseRow } = require("./fixtures");

beforeEach(() => {
  pool.query.mockReset();
});

/**
 * The handler checks that the property exists first, then fetches its open
 * houses -- so most tests have to queue two replies.
 */
function mockPropertyExists(openHouses = []) {
  pool.query
    .mockResolvedValueOnce(rows([{ L_ListingID: "123456789" }]))
    .mockResolvedValueOnce(rows(openHouses));
}

describe("GET /api/properties/:id/openhouses", () => {
  it("returns the open houses as a bare array", async () => {
    mockPropertyExists([openHouseRow]);

    const response = await request(app).get("/api/properties/123456789/openhouses");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([openHouseRow]);
  });

  it("returns an empty array for a property with no scheduled open houses", async () => {
    mockPropertyExists([]);

    const response = await request(app).get("/api/properties/123456789/openhouses");

    // 200 + [] rather than 404: the property exists, it just has no open houses.
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("orders results chronologically by date then start time", async () => {
    mockPropertyExists([openHouseRow]);

    await request(app).get("/api/properties/123456789/openhouses");

    expect(sqlOf(1)).toContain("ORDER BY OpenHouseDate ASC, OH_StartTime ASC");
    expect(valuesOf(1)).toEqual(["123456789"]);
  });

  it("checks that the property exists before querying open houses", async () => {
    mockPropertyExists([]);

    await request(app).get("/api/properties/123456789/openhouses");

    expect(sqlOf(0)).toBe(
      "SELECT L_ListingID FROM rets_property WHERE L_ListingID = ? LIMIT 1"
    );
    expect(sqlOf(1)).toContain("FROM rets_openhouse");
  });

  it("returns 404 for an unknown property without running the open house query", async () => {
    pool.query.mockResolvedValueOnce(rows([]));

    const response = await request(app).get("/api/properties/000000000/openhouses");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No property found with id 000000000" });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("is matched ahead of /:id, so 'openhouses' is never read as an id", async () => {
    mockPropertyExists([openHouseRow]);

    const response = await request(app).get("/api/properties/123456789/openhouses");

    expect(response.body).toEqual([openHouseRow]);
    expect(sqlOf(1)).toContain("rets_openhouse");
  });

  it("rejects an invalid id before touching the database", async () => {
    const response = await request(app).get("/api/properties/bad%20id/openhouses");

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("returns 500 when the open house query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "123456789" }]))
      .mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app).get("/api/properties/123456789/openhouses");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch open houses" });
    console.error.mockRestore();
  });
});
