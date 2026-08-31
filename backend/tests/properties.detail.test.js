jest.mock("../db/pool", () => ({ query: jest.fn() }));

const request = require("supertest");
const app = require("../server");
const { pool, rows, sqlOf, valuesOf } = require("./helpers/mockPool");
const { listingRow } = require("./fixtures");

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/properties/:id", () => {
  it("returns the listing row itself, not an envelope", async () => {
    pool.query.mockResolvedValueOnce(rows([listingRow]));

    const response = await request(app).get("/api/properties/123456789");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(listingRow);
  });

  it("looks the listing up by L_ListingID with a bound parameter", async () => {
    pool.query.mockResolvedValueOnce(rows([listingRow]));

    await request(app).get("/api/properties/123456789");

    expect(sqlOf(0)).toBe("SELECT * FROM rets_property WHERE L_ListingID = ? LIMIT 1");
    expect(valuesOf(0)).toEqual(["123456789"]);
  });

  it("returns 404 with the id when no row matches", async () => {
    pool.query.mockResolvedValueOnce(rows([]));

    const response = await request(app).get("/api/properties/000000000");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No property found with id 000000000" });
  });

  it("rejects an id with unexpected characters before touching the database", async () => {
    const response = await request(app).get("/api/properties/12%27%20OR%20%271");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("id must be alphanumeric and 64 characters or fewer");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects an id longer than 64 characters", async () => {
    const response = await request(app).get(`/api/properties/${"1".repeat(65)}`);

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("returns 500 when the query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app).get("/api/properties/123456789");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch property" });
    console.error.mockRestore();
  });
});
