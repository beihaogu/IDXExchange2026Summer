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

## Known data issue: `rets_property` / `rets_openhouse` are out of sync

Checked directly against this project's data: of the 4,282 rows in
`rets_openhouse`, **4,124 (~96%) reference an `L_ListingID` that does not
exist in `rets_property`** — the two dumps were clearly exported at different
times. This means most listing IDs will show zero open houses even where the
raw open house data exists. A handful of IDs with both records for demo
purposes: `1077426281`, `1088763330`, `1108620129`.
