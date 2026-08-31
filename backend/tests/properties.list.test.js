jest.mock("../db/pool", () => ({ query: jest.fn() }));

const request = require("supertest");
const app = require("../server");
const { pool, mockListQueries, sqlOf, valuesOf } = require("./helpers/mockPool");
const { listingRow } = require("./fixtures");

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/properties", () => {
  it("returns the paginated envelope with default limit and offset", async () => {
    mockListQueries({ total: 41199, results: [listingRow] });

    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      total: 41199,
      limit: 20,
      offset: 0,
      results: [listingRow],
    });
  });

  it("selects an explicit column list rather than SELECT *", async () => {
    mockListQueries({ total: 1, results: [listingRow] });

    await request(app).get("/api/properties");

    expect(sqlOf(1)).toContain("SELECT L_ListingID, L_Address");
    expect(sqlOf(1)).not.toContain("SELECT *");
  });

  it("runs the count against the same WHERE clause as the page query", async () => {
    mockListQueries({ total: 4, results: [] });

    await request(app).get("/api/properties?city=Portland");

    expect(sqlOf(0)).toBe(
      "SELECT COUNT(*) AS total FROM rets_property WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))"
    );
    // The count must not carry limit/offset, or `total` would cap at one page.
    expect(valuesOf(0)).toEqual(["Portland"]);
    expect(valuesOf(1)).toEqual(["Portland", 20, 0]);
  });

  describe("pagination", () => {
    it("passes limit and offset through as the last two bound values", async () => {
      mockListQueries({ total: 100, results: [] });

      const response = await request(app).get("/api/properties?limit=5&offset=40");

      expect(response.body.limit).toBe(5);
      expect(response.body.offset).toBe(40);
      expect(valuesOf(1).slice(-2)).toEqual([5, 40]);
    });

    it("accepts the maximum limit of 100", async () => {
      mockListQueries({ total: 100, results: [] });

      const response = await request(app).get("/api/properties?limit=100");

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(100);
    });

    it("rejects a limit above the maximum", async () => {
      const response = await request(app).get("/api/properties?limit=101");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("limit must be <= 100");
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("rejects a limit below 1", async () => {
      const response = await request(app).get("/api/properties?limit=0");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("limit must be >= 1");
    });

    it("rejects a negative offset", async () => {
      const response = await request(app).get("/api/properties?offset=-1");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("offset must be >= 0");
    });

    it("rejects a non-integer limit", async () => {
      const response = await request(app).get("/api/properties?limit=2.5");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("limit must be an integer");
    });

    it("rejects a non-numeric limit", async () => {
      const response = await request(app).get("/api/properties?limit=abc");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("limit must be an integer");
    });
  });

  describe("filters", () => {
    it("matches city case- and whitespace-insensitively", async () => {
      mockListQueries();

      await request(app).get("/api/properties?city=%20portland%20");

      expect(sqlOf(1)).toContain("WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
      expect(valuesOf(1)).toEqual([" portland ", 20, 0]);
    });

    it("trims the zipcode before binding it", async () => {
      mockListQueries();

      await request(app).get("/api/properties?zipcode=%2097201%20");

      expect(sqlOf(1)).toContain("WHERE L_Zip = ?");
      expect(valuesOf(1)).toEqual(["97201", 20, 0]);
    });

    it("applies minPrice and maxPrice as an inclusive range", async () => {
      mockListQueries();

      await request(app).get("/api/properties?minPrice=250000&maxPrice=750000");

      expect(sqlOf(1)).toContain("WHERE L_SystemPrice >= ? AND L_SystemPrice <= ?");
      expect(valuesOf(1)).toEqual([250000, 750000, 20, 0]);
    });

    it("treats beds and baths as minimums, not exact matches", async () => {
      mockListQueries();

      await request(app).get("/api/properties?beds=3&baths=2");

      expect(sqlOf(1)).toContain("WHERE L_Keyword2 >= ? AND LM_Dec_3 >= ?");
      expect(valuesOf(1)).toEqual([3, 2, 20, 0]);
    });

    it("ANDs every filter together in one WHERE clause", async () => {
      mockListQueries();

      await request(app).get(
        "/api/properties?city=Portland&zipcode=97201&minPrice=1&maxPrice=2&beds=3&baths=1.5"
      );

      expect(valuesOf(1)).toEqual(["Portland", "97201", 1, 2, 3, 1.5, 20, 0]);
    });

    it("omits the WHERE clause entirely when no filters are given", async () => {
      mockListQueries();

      await request(app).get("/api/properties");

      expect(sqlOf(1)).not.toContain("WHERE");
      expect(valuesOf(1)).toEqual([20, 0]);
    });

    it("rejects a blank city instead of matching every row with an empty string", async () => {
      const response = await request(app).get("/api/properties?city=%20%20");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("city must not be empty");
    });

    it("rejects a blank zipcode", async () => {
      const response = await request(app).get("/api/properties?zipcode=");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("zipcode must not be empty");
    });

    it("rejects a negative minPrice", async () => {
      const response = await request(app).get("/api/properties?minPrice=-5");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("minPrice must be >= 0");
    });

    it("rejects a non-numeric price", async () => {
      const response = await request(app).get("/api/properties?maxPrice=cheap");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("maxPrice must be a number");
    });

    it("rejects an inverted price range", async () => {
      const response = await request(app).get("/api/properties?minPrice=900000&maxPrice=100000");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("minPrice must not be greater than maxPrice");
    });

    it("reports every invalid parameter in one response rather than the first", async () => {
      const response = await request(app).get("/api/properties?limit=0&offset=-1&beds=lots");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid query parameters");
      expect(response.body.details).toHaveLength(3);
    });
  });

  describe("sorting", () => {
    it("orders by id alone when no sort is requested, for stable pagination", async () => {
      mockListQueries();

      await request(app).get("/api/properties");

      expect(sqlOf(1)).toContain("ORDER BY id LIMIT ? OFFSET ?");
    });

    it("defaults to ascending when only sortBy is given", async () => {
      mockListQueries();

      await request(app).get("/api/properties?sortBy=L_SystemPrice");

      expect(sqlOf(1)).toContain("ORDER BY L_SystemPrice asc, id asc");
    });

    it("points the id tiebreaker the same way as the sort, to keep the index scan", async () => {
      mockListQueries();

      await request(app).get("/api/properties?sortBy=L_SystemPrice&sortOrder=desc");

      expect(sqlOf(1)).toContain("ORDER BY L_SystemPrice desc, id desc");
    });

    it.each(["L_SystemPrice", "ListingContractDate", "LM_Int2_3", "L_Keyword2"])(
      "accepts %s as a sortable column",
      async (column) => {
        mockListQueries();

        const response = await request(app).get(`/api/properties?sortBy=${column}`);

        expect(response.status).toBe(200);
        expect(sqlOf(1)).toContain(`ORDER BY ${column} asc`);
      }
    );

    it("rejects a column outside the whitelist", async () => {
      const response = await request(app).get("/api/properties?sortBy=ListPrice");

      expect(response.status).toBe(400);
      expect(response.body.details[0]).toContain("sortBy must be one of");
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("rejects a SQL injection attempt through sortBy", async () => {
      const response = await request(app).get(
        "/api/properties?sortBy=id%3B%20DROP%20TABLE%20rets_property"
      );

      expect(response.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("rejects a sortOrder that is neither asc nor desc", async () => {
      const response = await request(app).get("/api/properties?sortBy=L_SystemPrice&sortOrder=up");

      expect(response.status).toBe(400);
      expect(response.body.details).toContain("sortOrder must be 'asc' or 'desc'");
    });
  });

  it("returns 500 without leaking the driver error when the query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error("ER_NO_SUCH_TABLE: rets_property"));

    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Failed to fetch properties" });
    console.error.mockRestore();
  });
});
