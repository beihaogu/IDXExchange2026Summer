// Shared assertion helpers for the route tests.
//
// The route handlers only ever touch `pool.query`, so the whole database layer
// is replaced with a single jest.fn() (see the `jest.mock` call at the top of
// each test file -- it has to live there so Jest can hoist it above the
// `require("../server")` that pulls the real module in). Tests then assert on
// the SQL text and the bound values, which is what actually encodes the
// routes' behaviour; running against a real MySQL would test the data instead.
const pool = require("../../db/pool");

/** mysql2's promise API resolves to `[rows, fields]`; wrap rows in that shape. */
function rows(value) {
  return [value, []];
}

/**
 * The list endpoint issues exactly two queries, in order: a COUNT(*) and then
 * the paginated SELECT. This queues a reply for each.
 */
function mockListQueries({ total = 0, results = [] } = {}) {
  pool.query.mockResolvedValueOnce(rows([{ total }])).mockResolvedValueOnce(rows(results));
}

/** Normalises whitespace so assertions don't depend on template-literal indentation. */
function sqlOf(callIndex) {
  return pool.query.mock.calls[callIndex][0].replace(/\s+/g, " ").trim();
}

function valuesOf(callIndex) {
  return pool.query.mock.calls[callIndex][1];
}

module.exports = { pool, rows, mockListQueries, sqlOf, valuesOf };
