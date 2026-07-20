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
