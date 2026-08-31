jest.mock("../db/pool", () => ({ query: jest.fn() }));

const request = require("supertest");
const app = require("../server");
const { pool, rows } = require("./helpers/mockPool");

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/health", () => {
  it("reports ok when the pool answers", async () => {
    pool.query.mockResolvedValueOnce(rows([{ 1: 1 }]));

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "connected" });
  });

  it("reports 500 and 'disconnected' when the pool is unreachable", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ status: "error", database: "disconnected" });
    console.error.mockRestore();
  });
});
