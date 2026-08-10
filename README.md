# Week 1 - MySQL Environment Setup

## Overview

This project sets up a local MySQL 8 instance using Docker and imports the provided RETS database dumps.

## Environment

- Docker Desktop
- MySQL 8
- Database: `rets`
- Container: `idx-mysql-local`

---

## Start MySQL

```bash
docker run \
  --name idx-mysql-local \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=rets \
  -p 3306:3306 \
  -d \
  mysql:8
```

---

## Import SQL Dumps

```bash
docker exec -i idx-mysql-local mysql -uroot -ppassword rets < rets_property.sql

docker exec -i idx-mysql-local mysql -uroot -ppassword rets < rets_openhouse.sql
```

---

## Verification

### Tables

```text
mysql> SHOW TABLES;

+----------------+
| Tables_in_rets |
+----------------+
| rets_openhouse |
| rets_property  |
+----------------+
```

### Row Counts

| Table | Rows |
|-------|-----:|
| rets_property | 41,199 |
| rets_openhouse | 4,282 |

Verified using:

```sql
SELECT COUNT(*) FROM rets_property;
SELECT COUNT(*) FROM rets_openhouse;
```

### Table Schemas

| Table | Columns |
|-------|--------:|
| rets_property | 126 |
| rets_openhouse | 13 |

Example columns from `rets_property`:

- id
- L_ListingID
- L_DisplayId
- L_Address
- L_City
- L_State
- L_SystemPrice
- ModificationTimestamp
- L_Status
- YearBuilt
- LotSizeSquareFeet
- PhotosChangeTimestamp

Example columns from `rets_openhouse`:

- id
- L_ListingID
- L_DisplayId
- OpenHouseDate
- OH_StartTime
- OH_EndTime
- updated_date

Schemas verified using:

```sql
DESCRIBE rets_property;
DESCRIBE rets_openhouse;
```

---

## Useful Commands

Start existing container:

```bash
docker start idx-mysql-local
```

Stop container:

```bash
docker stop idx-mysql-local
```

Open MySQL shell:

```bash
docker exec -it idx-mysql-local mysql -uroot -ppassword rets
```

## Why Docker?

A Docker container provides an isolated and reproducible runtime environment. Using the official MySQL 8 image ensures every developer runs the same database version and configuration without installing MySQL directly on the host operating system.

# Week 2 - Backend Foundation + REST API Basics

## Overview

This project now includes a basic Node/Express backend with a health check endpoint that verifies the MySQL connection.

## Backend Setup

The backend lives in:

```bash
backend/
```

Install dependencies:

```bash
cd backend
npm install
```

Start the development server:

```bash
npm run dev
```

The server runs on port `5000` by default.

## Environment Variables

Create `backend/.env` from `backend/.env.example` and fill in the local MySQL credentials.

The local Docker setup from Week 1 uses:

```env
PORT=5000
HOST=127.0.0.1
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=rets
DB_CONNECTION_LIMIT=10
```

Do not commit `.env`. It is listed in `.gitignore`.

## Health Check

Endpoint:

```http
GET /api/health
```

When MySQL is running and reachable:

```json
{
  "status": "ok",
  "database": "connected"
}
```

When MySQL is unreachable, the server returns HTTP `500` instead of crashing:

```json
{
  "status": "error",
  "database": "disconnected"
}
```

## Connection Pool

A connection pool is a reusable group of database connections managed by the application. When an API request needs the database, it borrows an available connection from the pool and returns it when the query is done.

Creating a brand-new database connection for every request is slow and expensive. Under heavier traffic, it can also exhaust the database connection limit. A pool keeps the app faster and more stable by reusing existing connections.

## HTTP Methods

- `GET`: Read or fetch data.
- `POST`: Create a new resource.
- `PUT`: Replace or update an existing resource.
- `DELETE`: Remove a resource.

## Common API Status Codes

- `400 Bad Request`: The client sent invalid input, such as missing required fields.
- `404 Not Found`: The requested route or resource does not exist.
- `500 Internal Server Error`: Something failed on the server, such as an unreachable database.

# Week 3 - Property Search Endpoint with Filters & Indexing

## Endpoint

```http
GET /api/properties?city=&zipcode=&minPrice=&maxPrice=&beds=&baths=&limit=&offset=
```

Returns:

```json
{ "total": 87, "limit": 20, "offset": 0, "results": [...] }
```

- `limit` defaults to 20, must be an integer from 1-100.
- `offset` defaults to 0, must be an integer >= 0.
- `city` matches case- and whitespace-insensitively (`LOWER(TRIM(...))`) since
  the source data has inconsistent casing (`"portland"`, `"Portland"`, ...).
- `beds` / `baths` are treated as minimums (`>=`).
- Invalid inputs (non-numeric, out of range, `minPrice > maxPrice`, empty
  strings) return `400` with a `details` array of messages.
- All filter values are bound as query parameters (`?` placeholders) — never
  concatenated into the SQL string.

## Indexes

Added in `backend/db/indexes.sql`:

- `idx_L_SystemPrice`, `idx_L_Keyword2` (beds), `idx_LM_Dec_3` (baths)
- `idx_city_price` — a **functional** index on `(LOWER(TRIM(L_City)), L_SystemPrice)`.
  A plain `(L_City, L_SystemPrice)` index can't be used once the column is
  wrapped in `LOWER(TRIM())` in the query — the index has to be built on the
  same expression.

`idx_L_City`, `idx_L_Zip`, and the primary key already existed from the Week 1
import.

Verified with `EXPLAIN`: filtering by price + beds went from a full scan
(`type: ALL`, `key: NULL`, 25,776 rows) to using the new indexes
(`type: range`, `key: idx_L_SystemPrice`, ~12,900 rows).

Note: creating an index on this table requires relaxing `sql_mode` for the
session — MySQL 8 re-validates every column's default when it rewrites the
table for `CREATE INDEX`, and an unrelated column (`active_check`) has a
zero-date default that trips `NO_ZERO_DATE` otherwise.

# Week 4 - Property Detail & Open House Endpoints

## Endpoints

```http
GET /api/properties/:id
GET /api/properties/:id/openhouses
```

- `:id` is validated against `^[A-Za-z0-9_-]{1,64}$` on both routes; anything
  else returns `400`.
- `/api/properties/:id` returns the full property row, or `404` if no
  property matches that `L_ListingID`.
- `/api/properties/:id/openhouses` first checks the property exists (`404` if
  not), then returns its open house rows ordered by date/start time — an
  empty array is a valid (200) result, not an error.
- `/:id/openhouses` is registered before `/:id` in `routes/properties.js`, per
  the general rule that more specific routes should be declared first in
  Express.
- Request logging middleware (`server.js`) logs every request's timestamp,
  method, URL, status code, and duration in ms via `res.on("finish")`.

## Known data issue: `rets_property` / `rets_openhouse` are partly out of sync

The two dumps were exported at different times, so some open house rows point
at listings the property dump doesn't contain. Measured against the currently
imported data:

| | rows |
| --- | --- |
| `rets_openhouse` total | 4,282 |
| matching a listing in `rets_property` | 3,541 (82.7%) |
| orphaned (no such `L_ListingID`) | 741 (17.3%) |

No listing has more than one open house row, and 1,087 of the matching rows
carry an `OpenHouseRemarks` value. Demo IDs with a property, an open house,
and remarks: `1174690153`, `1174257622`, `1174068134`.

Re-run the counts after re-importing either dump — these numbers move. An
earlier revision of this section recorded ~96% orphaned against a much older
`rets_property.sql`; re-importing the property dump on 2026-08-10 dropped it
to the 17.3% above and invalidated the demo IDs it listed.

# Week 6 - Filters UI + Unit Testing

## Filter form

`components/PropertyFilters.js` renders the six inputs — city, ZIP code, min
price, max price, and beds/baths as `<select>` dropdowns. All six are
controlled by a single `filters` state object updated with the spread operator,
so one `handleChange` serves every input via its `name` attribute.

`stripEmptyFilters()` drops blank values before the search is handed up to the
page. This is required, not cosmetic: the backend rejects a present-but-empty
`city` or `zipcode` with `400 city must not be empty`, so sending `city=""`
would break an otherwise valid search. It also trims surrounding whitespace.
`api/client.js` skips empty values a second time when building the query
string, so neither layer can leak a blank parameter on its own.

`ListingsPage` owns the filter state that drives fetching: `onSearch` replaces
it and `onClear` resets it to the shared `NO_FILTERS` constant, and a single
`useEffect` keyed on that object performs every request. Search and Clear
therefore go through exactly one code path.

## Debug Challenge: stale results flashing after search -> clear -> search

**Symptom.** Type a city, Search, Clear, type a new city, Search — the first
search's results appear for a moment before the new ones replace them.

**Cause.** Each interaction starts a `fetch` and they resolve in whatever order
the network returns them, not the order they were sent. The old effect wrote
every response into state unconditionally, so a slow first-search response
landing after the third request had been issued still rendered — a flash of
results for a query the user had already moved on from twice.

**Fix.** `latestRequestRef` in `pages/ListingsPage.js` gives each request an
incrementing id and records the newest one. Every `.then`/`.catch`/`.finally`
checks `isStale()` first and returns without touching state if a newer request
has since started. Only the newest response can render.

`pages/ListingsPage.test.js` pins this down: it hands out one deferred promise
per request and resolves them deliberately out of order. Removing the
`isStale()` guards makes that test fail with the stale address on screen, so it
reproduces the actual bug rather than just asserting current behaviour.

## Tests

```bash
cd frontend && npm test          # watch mode
cd frontend && CI=true npm test  # single run
```

16 tests across three suites:

- `api/client.test.js` — the success path, query-string building with empty
  values omitted, an API error body, a non-JSON error body, and a network
  failure.
- `components/PropertyFilters.test.js` — all six inputs render (beds/baths as
  dropdowns), only filled-in filters are submitted, all six combine into one
  search, and Clear resets the form without triggering a search.
- `pages/ListingsPage.test.js` — initial unfiltered load, filters reaching the
  API, the empty-results message, Clear reloading everything, the error state,
  and the out-of-order race above.

### Concepts

**Unit test.** A test of one small piece of code in isolation — a single
function or component — with its dependencies replaced, so a failure points at
that piece and nothing else. `stripEmptyFilters` is tested directly on its
input and output; no browser, network, or database is involved.

**Mocking.** Replacing a real dependency with a stand-in whose behaviour the
test controls. `jest.fn()` creates such a stub: it records how it was called
and returns whatever the test tells it to. `ListingsPage.test.js` uses
`jest.mock("../api/client")` to swap the whole client module out.

**Why mock `fetch()`.** Three reasons. It does not exist in jsdom, so the tests
would throw without a stand-in. Real requests would make the suite depend on a
running backend and a populated database, turning it slow and flaky. And error
paths — a 500, malformed JSON, a dropped connection — are trivial to produce
from a mock and nearly impossible to trigger on demand against a real server.

# Week 8 - Property Detail Page, Photos & Map

## Overview

Adds client-side routing and a full property detail page: `react-router-dom`
now drives navigation between the listings grid and `/property/:id`, cards
show a photo carousel instead of a single static image, and the detail page
adds a photo gallery with a lightbox, an embedded Google map, and the open
house list.

## Routes

```text
/                 ListingsPage
/property/:id     PropertyDetailPage
```

Cards (`components/PropertyCard.js`) are now a `react-router-dom` `Link` to
`/property/:id` instead of a plain `div`. `PropertyDetailPage` fetches
`GET /api/properties/:id` and `GET /api/properties/:id/openhouses` (both from
Week 4) and renders price, address, stats, description, a curated property
details grid, the photo gallery, the map, and open houses. An invalid or
unknown id surfaces the API's error message instead of crashing, because the
fetch is wrapped the same way `ListingsPage` wraps its own request.

### Why `react-router-dom` v6 and not v7

v7 is pinned away from deliberately. It resolves `react-router/dom` through a
package `exports` map, which the Jest 27 bundled with `react-scripts@5` does
not read — every suite importing a router died with
`Cannot find module 'react-router/dom'`, and shimming past that only surfaced
the next incompatibility (`TextEncoder is not defined`). v6 is built for this
toolchain and needs no shims. Nothing here uses a v7-only API, so the upgrade
is a version bump once the build tooling moves off CRA.

Both routers pass `ROUTER_FUTURE_FLAGS` (exported from `App.js`) to opt into
the two v7 behaviours v6 warns about, which keeps the console and the test
output clean.

## New components

- `PropertyImageCarousel` (`components/`) — used on cards. Cycles through
  `L_Photos` with prev/next arrows and an `X / Y` counter; single-photo and
  no-photo properties fall back to a plain image or a placeholder. Arrow
  clicks call `stopPropagation()` so they don't trigger the card's `Link`
  navigation.
- `PropertyImageGallery` + `Lightbox` (`components/`) — used on the detail
  page. A large main image with a scrollable thumbnail strip below it;
  clicking a thumbnail swaps the main image, clicking the main image opens
  `Lightbox`, a full-screen overlay with its own prev/next controls.
- `PropertyMap` (`components/`) — a Google Maps Embed API `<iframe>` built
  from `LMD_MP_Latitude`/`LMD_MP_Longitude`. Renders nothing if either
  coordinate is missing, and shows a "set the API key" message instead of a
  broken frame if `REACT_APP_GOOGLE_MAPS_API_KEY` isn't configured. Always
  renders a "Get Directions" link to Google Maps (`target="_blank"`) since
  that only needs the coordinates, not the API key.
- `OpenHouseList` (`components/`) — renders date/time/remarks per open house,
  or "No open houses scheduled". Use the demo IDs listed in the Week 4 data
  note to see a populated one; most listings legitimately have none.

Both photo components parse `L_Photos` through the same
`utils/photos.js::parsePhotos` helper: `JSON.parse` in a `try/catch`,
falling back to `[]` on failure or a non-array result.

## Google Maps Setup

1. Go to <https://console.cloud.google.com> and sign in.
2. Create a new project.
3. **APIs & Services > Library** — enable the **Maps Embed API**.
4. **APIs & Services > Credentials** — create an API key.
5. Add it to `frontend/.env` (copy `frontend/.env.example`):
   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=your_key
   ```
6. Restrict the key to `localhost:3000` and the Maps Embed API only.
7. Restart `npm start` — Create React App only reads `REACT_APP_*` variables
   at startup, so an edit to `.env` needs a restart to take effect.

## Debug Challenge: open house remarks never show up

**Symptom.** Open houses render with the right date and time, but
`OpenHouseRemarks` is always blank, even for rows that have one in the
database.

**Cause.** `OpenHouseRemarks` isn't its own column — `rets_openhouse` stores
it inside the `all_data` JSON blob alongside dozens of other RETS fields.
Reading `openHouse.OpenHouseRemarks` directly reads `undefined` off the row
object; the value is one level deeper, behind a second parse.

**Fix.** `utils/openHouse.js::parseOpenHouseRemarks` does
`JSON.parse(allData).OpenHouseRemarks` in a `try/catch`, in the component
layer — the API keeps returning `all_data` as-is, per the task's constraint
not to change the backend.

## Debug Challenge: Escape doesn't close the lightbox

**Symptom.** `Lightbox` has an `onKeyDown` handler that checks for `"Escape"`,
but pressing the key does nothing.

**Cause.** Keyboard events target whatever element currently has focus, and a
plain `<div>` can never hold focus — so the keydown never reaches it (or
anything below it) in the first place, regardless of the handler.

**Fix.** `components/Lightbox.js` gives the overlay `tabIndex={-1}` (focusable
by script, still skipped by Tab-key navigation) and focuses it with a `ref` in
a `useEffect` on mount. Once the div holds focus, its `onKeyDown` fires
normally for Escape and the left/right arrow keys.

## Tests

New suites: `utils/photos.test.js`, `utils/openHouse.test.js`,
`components/PropertyImageCarousel.test.js`,
`components/PropertyImageGallery.test.js`, `components/PropertyMap.test.js`,
`components/OpenHouseList.test.js`, and `pages/PropertyDetailPage.test.js`
(routing, both fetches, the invalid-id error path, and the two debug
challenges above).
