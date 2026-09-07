# IDX Exchange — Architecture

Diagrams for the Week 12 presentation. The Mermaid blocks render on GitHub;
the ASCII version in [`presentation.md`](presentation.md) is the one to copy
onto a whiteboard.

- [System overview](#system-overview)
- [Request lifecycle: search → results](#request-lifecycle-search--results)
- [Frontend component tree](#frontend-component-tree)
- [State ownership on the listings page](#state-ownership-on-the-listings-page)
- [Out-of-order responses, and the guard](#out-of-order-responses-and-the-guard)
- [Data model](#data-model)

---

## System overview

Three tiers, one direction of dependency. The browser never talks to MySQL, and
the API holds no session state — every request carries everything it needs.

```mermaid
graph LR
  subgraph Browser["Browser · localhost:3000"]
    UI["React 18 SPA<br/>CRA dev server"]
  end

  subgraph API["Express API · localhost:3001"]
    R["routes/properties.js<br/>validate → build SQL → respond"]
    P["mysql2 connection pool"]
  end

  subgraph DB["MySQL 8"]
    T1[("rets_property<br/>53,122 rows · 126 cols")]
    T2[("rets_openhouse<br/>4,282 rows · 13 cols")]
  end

  UI -->|"HTTP · JSON<br/>GET /api/properties?…"| R
  R --> P
  P -->|"parameterized SQL"| T1
  P --> T2
  T1 -.->|rows| P
  P -.->|"{ results, total, limit, offset }"| UI
```

**Endpoints**

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/health` | liveness |
| `GET` | `/api/properties` | one page of results + total count |
| `GET` | `/api/properties/:id` | one property |
| `GET` | `/api/properties/:id/openhouses` | that property's open houses |

---

## Request lifecycle: search → results

The hop-by-hop version of the whiteboard drawing. Note where the request
**stops early**: an invalid parameter never reaches the database.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant F as PropertyFilters
  participant H as usePropertySearch
  participant C as api/client.js
  participant E as Express route
  participant M as MySQL

  U->>F: fills city / price / beds, clicks Search
  F->>H: search(filters)
  Note over H: setFilters · clear sort · page = 1<br/>one state change, one effect run
  H->>H: effect on [filters, sort, currentPage]
  Note over H: requestId = ++latestRequestRef
  H->>C: fetchProperties({…filters, limit, offset})
  Note over C: empty values dropped from<br/>the query string
  C->>E: GET /api/properties?city=Portland&limit=20&offset=0

  E->>E: validate every param
  alt any param invalid
    E-->>C: 400 { error, details[] }
    Note over E: never reaches the database
  else all valid
    E->>E: build WHERE + values in lockstep
    E->>M: SELECT COUNT(*) … WHERE …
    M-->>E: total
    E->>M: SELECT … WHERE … ORDER BY … LIMIT ? OFFSET ?
    M-->>E: 20 rows
    E-->>C: 200 { results, total, limit, offset }
  end

  C-->>H: parsed JSON (or a thrown Error)
  Note over H: isStale()? → drop it
  H-->>U: 20 PropertyCards + page bar from total
```

---

## Frontend component tree

```mermaid
graph TD
  App["App · router"] --> EB["ErrorBoundary"]
  EB --> LP["ListingsPage"]
  EB --> DP["PropertyDetailPage"]

  LP --> PF["PropertyFilters"]
  LP --> PS["PropertySort"]
  LP --> PC["PropertyCard ×20"]
  LP --> PG["Pagination"]

  DP --> PIG["PropertyImageGallery"]
  DP --> PM["PropertyMap"]
  DP --> OHL["OpenHouseList"]
  PIG --> LB["Lightbox"]
  PIG --> PIC["PropertyImageCarousel"]

  LP -.->|state| UPS(["usePropertySearch"])
  DP -.->|state| UPD(["usePropertyDetail"])

  classDef hook fill:#eef,stroke:#88a,stroke-dasharray:4 3
  class UPS,UPD hook
```

Both pages are rendering only — the dashed nodes are the custom hooks that own
the fetching and the state.

---

## State ownership on the listings page

Filters, sort and page are one unit because they reset each other. Every arrow
below is a reset rule that would otherwise have to live in the component.

```mermaid
stateDiagram-v2
  [*] --> Idle: mount · page 1, no filters
  Idle --> Fetching: effect on [filters, sort, page]

  Fetching --> Ready: newest response
  Fetching --> Failed: fetch throws
  Fetching --> Fetching: stale response — dropped

  Ready --> Fetching: search() — new filters, sort cleared, page → 1
  Ready --> Fetching: clear() — filters and sort dropped, page → 1
  Ready --> Fetching: changeSort() — filters kept, page → 1
  Ready --> Fetching: goToPage() — filters and sort both kept

  Failed --> Fetching: any of the above (form stays usable)
```

**The rule to say out loud:** anything that changes *which* rows match returns
to page 1; only `goToPage` doesn't. Page 3 of the old result set may not exist
in the new one.

---

## Out-of-order responses, and the guard

The bug from Week 6, as a picture. Requests are sent in order; responses are
not.

```mermaid
sequenceDiagram
  participant H as usePropertySearch
  participant N as Network

  H->>N: #1 city=portland
  H->>N: #2 (cleared)
  H->>N: #3 city=eugene
  Note over H: latestRequestRef = 3

  N-->>H: #3 responds first
  Note over H: 3 === 3 → render Eugene ✓
  N-->>H: #1 responds late
  Note over H: 1 ≠ 3 → isStale() → dropped ✓

  rect rgba(200,60,60,.12)
    Note over H,N: Without the guard, #1 lands last<br/>and overwrites Eugene with Portland —<br/>the flash of stale results
  end
```

`ListingsPage.test.js` resolves deferred promises in exactly this order;
removing the `isStale()` guards makes it fail.

---

## Data model

```mermaid
erDiagram
  rets_property ||--o{ rets_openhouse : "L_ListingID"

  rets_property {
    int id PK "tiebreaker in every ORDER BY"
    varchar L_ListingID "join key"
    varchar L_Address
    varchar L_City "inconsistent casing — normalized in SQL"
    varchar L_Zip
    int L_SystemPrice "nullable / zero"
    int L_Keyword2 "beds · nullable"
    decimal LM_Dec_3 "baths · nullable"
    int LM_Int2_3 "sqft"
    text L_Photos "JSON — sometimes null, empty or malformed"
    decimal LMD_MP_Latitude "sometimes missing or zero"
    decimal LMD_MP_Longitude "sometimes missing or zero"
    date ListingContractDate
  }

  rets_openhouse {
    int id PK
    varchar L_ListingID FK
    date OpenHouseDate
    time OH_StartTime
    time OH_EndTime
    json all_data "OpenHouseRemarks lives in here"
  }
```

### Indexes that matter

| Index | Columns | What it serves |
|---|---|---|
| `idx_city_price` | `(LOWER(TRIM(L_City)), L_SystemPrice)` | city filter + price range + the ORDER BY. **Functional** — a plain index on `L_City` is unusable once the query wraps it in `LOWER(TRIM())`. |
| `idx_L_SystemPrice` | `(L_SystemPrice)` → physically `(L_SystemPrice, id)` | price-only sorts. InnoDB appends the PK, which is why the tiebreaker must follow the sort direction. |

`EXPLAIN` on the city+price query: `type: ALL`, `key: NULL`,
`Using where; Using filesort`, 53,122 rows, **557 ms** → after the index,
116 rows examined, no filesort, **4.3 ms**.

### The data problems the code has to absorb

| Where | Problem | Handled by |
|---|---|---|
| `L_City` | `portland` / `Portland` / `PORTLAND` | `LOWER(TRIM())` on both sides + functional index |
| `L_Photos` | null, empty string, or malformed JSON | `utils/photos.js`, parse in `try/catch` → empty gallery |
| lat/lon | missing or zero | `PropertyMap` renders conditionally |
| `L_SystemPrice` | null or zero | `utils/format.js` → "Price unavailable" rather than `$0` |
| `L_Keyword2` / `LM_Dec_3` | null | omitted rather than rendered as `null beds` |
| `OpenHouseRemarks` | not a column — nested in `all_data` | `utils/openHouse.js::parseOpenHouseRemarks` |
| `sortBy` | RESO names silently return unsorted rows | whitelist of real SQL column names → `400` |
