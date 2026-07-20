const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const LISTING_COLUMNS = [
  "L_ListingID",
  "L_Address",
  "L_City",
  "L_State",
  "L_Zip",
  "L_SystemPrice",
  "L_Keyword2",
  "LM_Dec_3",
  "LM_Int2_3",
  "L_Photos",
  "LMD_MP_Latitude",
  "LMD_MP_Longitude",
  "YearBuilt",
  "LotSizeAcres",
];

function parseIntParam(rawValue, { min, max, fieldName }) {
  const n = Number(rawValue);
  if (!Number.isInteger(n)) {
    return { error: `${fieldName} must be an integer` };
  }
  if (min !== undefined && n < min) {
    return { error: `${fieldName} must be >= ${min}` };
  }
  if (max !== undefined && n > max) {
    return { error: `${fieldName} must be <= ${max}` };
  }
  return { value: n };
}

function parseNumberParam(rawValue, { min, fieldName }) {
  if (rawValue === undefined || rawValue === "") {
    return { value: undefined };
  }
  const n = Number(rawValue);
  if (Number.isNaN(n)) {
    return { error: `${fieldName} must be a number` };
  }
  if (min !== undefined && n < min) {
    return { error: `${fieldName} must be >= ${min}` };
  }
  return { value: n };
}

// L_ListingID values are short alphanumeric strings (observed as 9-10 digit
// numbers, but stored as varchar) -- this rejects anything that couldn't be
// a real listing ID without assuming a specific format.
const LISTING_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isValidListingId(id) {
  return typeof id === "string" && LISTING_ID_PATTERN.test(id);
}

router.get("/", async (req, res) => {
  const { city, zipcode, minPrice, maxPrice, beds, baths } = req.query;
  const errors = [];

  const limitResult = parseIntParam(req.query.limit ?? DEFAULT_LIMIT, {
    min: 1,
    max: MAX_LIMIT,
    fieldName: "limit",
  });
  if (limitResult.error) errors.push(limitResult.error);

  const offsetResult = parseIntParam(req.query.offset ?? 0, {
    min: 0,
    fieldName: "offset",
  });
  if (offsetResult.error) errors.push(offsetResult.error);

  const minPriceResult = parseNumberParam(minPrice, { min: 0, fieldName: "minPrice" });
  if (minPriceResult.error) errors.push(minPriceResult.error);

  const maxPriceResult = parseNumberParam(maxPrice, { min: 0, fieldName: "maxPrice" });
  if (maxPriceResult.error) errors.push(maxPriceResult.error);

  const bedsResult = parseNumberParam(beds, { min: 0, fieldName: "beds" });
  if (bedsResult.error) errors.push(bedsResult.error);

  const bathsResult = parseNumberParam(baths, { min: 0, fieldName: "baths" });
  if (bathsResult.error) errors.push(bathsResult.error);

  if (
    minPriceResult.value !== undefined &&
    maxPriceResult.value !== undefined &&
    minPriceResult.value > maxPriceResult.value
  ) {
    errors.push("minPrice must not be greater than maxPrice");
  }

  if (city !== undefined && city.trim() === "") {
    errors.push("city must not be empty");
  }

  if (zipcode !== undefined && zipcode.trim() === "") {
    errors.push("zipcode must not be empty");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Invalid query parameters", details: errors });
  }

  // Build WHERE clause and matching values in lockstep so the same
  // (conditions, values) pair can be reused for both the count query
  // and the paginated select — limit/offset are appended only for the latter.
  const conditions = [];
  const values = [];

  if (city !== undefined) {
    conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
    values.push(city);
  }

  if (zipcode !== undefined) {
    conditions.push("L_Zip = ?");
    values.push(zipcode.trim());
  }

  if (minPriceResult.value !== undefined) {
    conditions.push("L_SystemPrice >= ?");
    values.push(minPriceResult.value);
  }

  if (maxPriceResult.value !== undefined) {
    conditions.push("L_SystemPrice <= ?");
    values.push(maxPriceResult.value);
  }

  if (bedsResult.value !== undefined) {
    conditions.push("L_Keyword2 >= ?");
    values.push(bedsResult.value);
  }

  if (bathsResult.value !== undefined) {
    conditions.push("LM_Dec_3 >= ?");
    values.push(bathsResult.value);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`,
      values
    );
    const total = countRows[0].total;

    const [results] = await pool.query(
      `SELECT ${LISTING_COLUMNS.join(", ")} FROM rets_property ${whereClause} ORDER BY id LIMIT ? OFFSET ?`,
      [...values, limitResult.value, offsetResult.value]
    );

    res.json({
      total,
      limit: limitResult.value,
      offset: offsetResult.value,
      results,
    });
  } catch (error) {
    console.error("Failed to fetch properties:", error.message);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Registered before "/:id" -- Express would otherwise treat "openhouses" in
// "/api/properties/:id/openhouses" as a second path segment that ":id" (a
// single-segment matcher) can't consume, but a more specific route defined
// first is still the correct general rule to follow.
router.get("/:id/openhouses", async (req, res) => {
  const { id } = req.params;

  if (!isValidListingId(id)) {
    return res.status(400).json({ error: "id must be alphanumeric and 64 characters or fewer" });
  }

  try {
    const [propertyRows] = await pool.query(
      "SELECT L_ListingID FROM rets_property WHERE L_ListingID = ? LIMIT 1",
      [id]
    );

    if (propertyRows.length === 0) {
      return res.status(404).json({ error: `No property found with id ${id}` });
    }

    const [openHouses] = await pool.query(
      `SELECT L_ListingID, OpenHouseDate, OH_StartTime, OH_EndTime, all_data
       FROM rets_openhouse
       WHERE L_ListingID = ?
       ORDER BY OpenHouseDate ASC, OH_StartTime ASC`,
      [id]
    );

    res.json(openHouses);
  } catch (error) {
    console.error(`Failed to fetch open houses for listing ${id}:`, error.message);
    res.status(500).json({ error: "Failed to fetch open houses" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!isValidListingId(id)) {
    return res.status(400).json({ error: "id must be alphanumeric and 64 characters or fewer" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM rets_property WHERE L_ListingID = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `No property found with id ${id}` });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(`Failed to fetch property ${id}:`, error.message);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

module.exports = router;
