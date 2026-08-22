-- Week 3: indexes supporting GET /api/properties filters.
-- idx_L_City, idx_L_Zip, and PRIMARY (id) already exist from the initial import.
--
-- MySQL 8 rewrites the table when adding an index, which re-validates every
-- column's default value under the active sql_mode. active_check's zero-date
-- default trips NO_ZERO_DATE, so sql_mode is relaxed for this session only.
SET SESSION sql_mode = '';

CREATE INDEX idx_L_SystemPrice ON rets_property (L_SystemPrice);
CREATE INDEX idx_L_Keyword2 ON rets_property (L_Keyword2);
CREATE INDEX idx_LM_Dec_3 ON rets_property (LM_Dec_3);

-- Functional index matching the LOWER(TRIM(L_City)) expression used in the
-- WHERE clause -- a plain (L_City, L_SystemPrice) index can't be used by the
-- optimizer once the column is wrapped in functions.
CREATE INDEX idx_city_price ON rets_property ((LOWER(TRIM(L_City))), L_SystemPrice);

-- Week 9: indexes supporting ORDER BY. The sort dropdown offers four columns
-- in both directions; each combination has to be served by an index scan or
-- MySQL sorts all 53k rows on every request (EXPLAIN: Using filesort).
--
-- Only two new indexes are needed, not eight, because:
--   * InnoDB appends the primary key to every secondary index, so a plain
--     index on (col) is physically (col, id) -- it already satisfies
--     "ORDER BY col ASC, id ASC".
--   * The same index read backwards satisfies "ORDER BY col DESC, id DESC",
--     which is why the ORDER BY in routes/properties.js makes the id
--     tiebreaker follow the sort direction instead of pinning it to ASC.
--   * L_SystemPrice and L_Keyword2 are already indexed above (they are
--     filter columns too), which leaves only these two.
CREATE INDEX idx_ListingContractDate ON rets_property (ListingContractDate);
CREATE INDEX idx_LM_Int2_3 ON rets_property (LM_Int2_3);
