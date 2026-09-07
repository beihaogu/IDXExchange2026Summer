# IDX Exchange — Final Presentation (15 minutes)

Speaking script and architecture reference for the Week 12 demo. Timings are
targets, not a script to read aloud — the bolded lines are the points that must
land; the rest is supporting detail to fall back on if asked.

**Before you start:** see [Pre-demo checklist](#pre-demo-checklist) at the
bottom. The fresh `rets_property` / `rets_openhouse` dumps must already be
imported, or sold listings will show broken images.

---

## 0. Setup (do this before the room is watching)

| | |
|---|---|
| Terminal 1 | `cd backend && npm start` — port 3001 |
| Terminal 2 | `cd frontend && npm start` — port 3000 |
| Terminal 3 | empty, sitting in `backend/` — this is where you kill the server later |
| Browser | one tab on `http://localhost:3000`, listings loaded, filters empty |
| Editor | `usePropertySearch.js`, `routes/properties.js`, `utils/pagination.js` open in tabs |

---

## 1. Live Demo (5 minutes)

### The full user flow (3 min)

Narrate what you are doing and *what the code had to handle*, not just what you
are clicking.

1. **Land on the listings page.** "53,122 properties in the table, 20 per page.
   The first thing to say is that nothing here is loaded into the browser — the
   filtering, sorting and paging all happen in MySQL, and the API returns one
   page at a time plus a total count."
2. **Search a city.** Type `portland` in lower case and hit Search.
   **Say it out loud:** "I typed it lower case on purpose. The city column has
   `portland`, `Portland` and `PORTLAND` in it, so the query normalizes both
   sides — `LOWER(TRIM(L_City)) = LOWER(TRIM(?))` — and there's a functional
   index built on that same expression so the normalization doesn't cost a table
   scan."
3. **Add filters.** Min price + beds + baths. Point out the result count
   dropping in the header.
4. **Sort** — price high to low. **This is the advanced feature.** "Sorting is
   the piece with the sharpest edge on it; I'll come back to why in the
   architecture section."
5. **Paginate.** Jump to page 2, then to the last page.
   Point at the page bar: "`1 … 22 23 24`, and the last page never appears
   twice — that's a bug I fixed, it's in the walkthrough."
6. **Open a detail page.** Point out: full photo gallery, the map, the open
   house list.
7. **Map.** "Some rows have missing or zero lat/lon. The map is conditionally
   rendered — a property without coordinates shows the rest of the detail page
   with no broken map frame."
8. **Lightbox.** Open a photo, arrow left/right, **press Escape to close.**
   "Escape works because the overlay is focusable and takes focus on mount —
   that was a bug too."

### Error handling (2 min)

**Take the backend down mid-demo — this is deliberate, tell them so first.**

1. Say: "Now I'm going to kill the API while the app is running."
2. Terminal 3: `Ctrl-C` the backend.
3. In the browser, change a filter and hit Search.
4. **The app shows an error message, not a blank page and not a spinner that
   never stops.** Every fetch in `api/client.js` throws with the server's error
   body when there is one and an HTTP status when there isn't; the page renders
   that message and keeps the filter form usable.
5. Restart the backend (`npm start`), hit Search again — **it recovers without a
   page reload.**
6. If asked about render-time crashes rather than fetch failures: `ErrorBoundary`
   wraps the app and catches those separately, so one bad property row can't
   white-screen the whole page.

---

## 2. Architecture Deep Dive (5 minutes)

### Draw the data flow (2 min)

Draw this on the whiteboard as you talk. Round trip, browser to database and
back. (Rendered version with the full diagram set: [`architecture.md`](architecture.md).)

```
   Browser                     Express API                    MySQL
┌──────────────┐          ┌──────────────────┐         ┌──────────────────┐
│ ListingsPage │          │ GET /api/        │         │ rets_property    │
│      │       │          │   properties     │         │ 53,122 rows      │
│ usePropertySearch  ───▶ │        │         │  ────▶  │                  │
│      │       │  HTTP    │  validate params │  pool   │ idx_city_price   │
│ api/client.js│  :3001   │        │         │  .query │ idx_L_SystemPrice│
│      │       │          │  build WHERE +   │         │                  │
│ PropertyCard │  ◀────   │  ORDER BY, bind  │  ◀────  │ rets_openhouse   │
│ Pagination   │  JSON    │  values (?)      │  rows   │ 4,282 rows       │
└──────────────┘          │        │         │         └──────────────────┘
                          │  COUNT(*) + page │
                          └──────────────────┘
```

Walk it in one sentence per hop:

1. **A filter change or a page click sets state in `usePropertySearch`.**
2. **A `useEffect` keyed on `(filters, sort, page)` fires one fetch** — the hook
   owns the request, the page component only renders.
3. **`api/client.js` builds the query string,** dropping empty values so an
   untouched filter never reaches the API.
4. **The route validates every parameter first** and returns `400` with a list
   of what was wrong, before touching the database.
5. **The WHERE clause and its bound values are built in lockstep** into two
   parallel arrays, so the same pair serves both the `COUNT(*)` and the
   paginated `SELECT`.
6. **MySQL answers both queries off the composite indexes,** the route returns
   `{ results, total, limit, offset }`, and `total` is what drives the page bar.

### One technical decision, and why (1.5 min)

**Pick this one: the sort tiebreaker follows the sort direction.**

> "Sorting by price alone isn't deterministic — lots of properties share a
> price, and MySQL is free to return tied rows in any order. That means a
> listing can appear on both page 1 and page 2, or on neither. So the ORDER BY
> is `L_SystemPrice, id` — `id` is unique, so the total order is fixed.
>
> The interesting part is the direction. My first version was
> `ORDER BY L_SystemPrice DESC, id ASC`, which is still perfectly
> deterministic — and it was catastrophically slow. `EXPLAIN` said
> `Using filesort` over 53,000 rows, about 630 ms.
>
> The reason is that InnoDB appends the primary key to every secondary index, so
> `idx_L_SystemPrice` is physically `(L_SystemPrice, id)` ascending. MySQL can
> read an index forwards or backwards, but `DESC, ASC` is neither direction —
> so the optimizer gave up on the index and sorted the whole result set.
> Making the tiebreaker follow the sort direction, `DESC, DESC`, turns it into a
> plain reverse index scan: about 2 ms, and just as deterministic, because `id`
> is unique either way."

Same story, shorter, if you're running behind: **"a correct ORDER BY that the
index can't serve is still a table scan — 630 ms down to 2 ms by matching the
tiebreaker's direction to the sort's."**

### One bug and how you debugged it (1.5 min)

**Pick this one: stale results flashing after search → clear → search.**

- **Symptom.** Type a city, Search, Clear, type a different city, Search — the
  *first* search's results flash on screen before the new ones replace them.
- **What made it hard.** It only reproduced when the network was slow, and it
  looked like a caching or state-reset problem, which is where I looked first
  and lost time.
- **How I actually found it.** Logged a timestamp and the query at request time
  and again at response time, and the log showed responses arriving in a
  different order than the requests were sent. `fetch` resolution order is not
  request order — that was the root cause, and it had nothing to do with state
  resets.
- **The fix.** `latestRequestRef` gives each request an incrementing id and
  records the newest. Every `.then` / `.catch` / `.finally` checks `isStale()`
  first and returns without touching state if a newer request has started. Only
  the newest response can write.
- **How it's pinned down.** `ListingsPage.test.js` hands out one deferred
  promise per request and resolves them deliberately out of order. **Delete the
  `isStale()` guards and that test fails with the stale address on screen** — it
  reproduces the bug, it doesn't just assert current behaviour.

---

## 3. Code Walkthrough (5 minutes)

### The most complex piece (2 min)

Open **`frontend/src/hooks/usePropertySearch.js`** — 96 lines, and it owns the
whole listings page.

Three things to point at:

1. **Why it's one hook and not three.** Filters, sort and page reset each other
   in specific ways: a new search drops the sort *and* returns to page 1; a sort
   change keeps the filters but returns to page 1; a page click keeps both. Split
   across separate hooks, that coordination has to happen in the component —
   which is exactly what this was meant to get out of the component.
2. **One effect, one dependency array — `[filters, sort, currentPage]`.** There
   is no imperative "now go fetch" anywhere. Every path that changes the query
   changes state, and the request is derived from the state. That's why a filter
   change resetting the page can't produce two fetches or a request for the
   wrong page.
3. **The `isStale()` guards** — the fix from the bug above, in situ.

Then say what it buys: `ListingsPage.js` is 94 lines of rendering with no fetch
logic in it at all.

**If they'd rather see backend code,** the equivalent is `routes/properties.js`
— the parallel `conditions` / `values` arrays, the validate-everything-before-
querying pass, and the sort whitelist.

### The test suite (2 min)

Run it live — it takes about 5 seconds:

```bash
cd backend  && npx jest --coverage
cd frontend && CI=true npx react-scripts test --coverage --watchAll=false
```

| | Tests | Statements | Branches |
|---|---|---|---|
| Backend | 49 | 97.87% | 95.69% |
| Frontend | 123 | 98%+ components, 100% pages and utils | 93% components |

Both projects **fail the run below 70%**, so this can't quietly rot.

What it actually covers — say this rather than reading numbers:

- **Every route, every validation path.** Bad price ranges, non-integer paging,
  an empty city, an unknown sort column — each returns `400` with a list of what
  was wrong, and there's a test per branch.
- **The Appendix A data problems, as tests.** Malformed and null `L_Photos`,
  missing lat/lon, inconsistent city casing, `OpenHouseRemarks` buried in the
  `all_data` blob.
- **Two regression tests that reproduce real bugs** — the out-of-order fetch
  test above, and `pagination.test.js`'s "never repeats a page number", which
  walks every `(currentPage, totalPages)` pair across five list sizes.
  **Both fail if you undo the fix.**

**The line worth saying:** "The tests I care about are the ones that fail when
the fix is removed. The coverage percentage is a floor, not the point."

### What I'd do differently with more time (1 min)

Be specific and honest — this is the question that separates a real answer from
a rehearsed one. Pick two or three:

- **The `all_data` JSON parse belongs in the API, not the component.**
  `parseOpenHouseRemarks` lives in the frontend because the task said not to
  change the backend's response shape. That's the wrong seam: every future
  client would have to re-implement it.
- **No caching layer.** Every search hits MySQL. The result of a
  `(filters, sort, page)` tuple is trivially cacheable, and the same tuple is
  requested constantly as a user pages back and forth.
- **`COUNT(*)` on every request is the expensive half.** At this row count it's
  fine; past a few hundred thousand rows I'd cache the count per filter set or
  move to keyset pagination.
- **No end-to-end test.** Everything is unit and integration level against a
  mocked fetch; nothing drives a real browser against a real database.
- **The filter form doesn't sync to the URL,** so a search can't be shared or
  survive a refresh.

---

## Interview prep

Short answers to the questions in the guide. Say the first line or two; the rest
is there if they push.

**"Walk me through what happens when a user types Portland and clicks Search."**
`PropertyFilters` collects the six inputs and calls `search(filters)` on submit.
That sets `filters`, clears the sort, and sets page back to 1 in
`usePropertySearch`. The effect keyed on those fires, `api/client.js` builds
`?city=Portland&limit=20&offset=0` — omitting the untouched filters entirely —
and fetches `/api/properties`. The route validates each parameter, builds
`WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))` with `Portland` bound as a value,
runs a `COUNT(*)` and a 20-row `SELECT` against `idx_city_price`, and returns
`{ results, total, limit, offset }`. The hook checks the response isn't stale,
writes it to state, and the page renders 20 `PropertyCard`s plus a page bar
derived from `total`.

**"Why parameterized queries? What happens without them?"**
The value is sent to MySQL separately from the SQL text, so it can never be
parsed as SQL — it's data, always. Without them, a city of `x' OR '1'='1`
returns the whole table, and `'; DROP TABLE rets_property; --` is the version
that ends the interview. Note the one place I *do* interpolate: `ORDER BY`
column names can't be bound as placeholders, so `sortBy` is checked against a
four-entry whitelist of real column names and anything else is a `400`. The
whitelist is the parameterization there.

**"What does EXPLAIN tell you? What did you find?"**
It returns the plan instead of running the query — which index it intends to
use, the access method, and the estimated row count. The columns I read are
`type` (`ALL` means a full scan), `key` (which index was actually chosen), and
`Extra` (`Using filesort` means the ORDER BY couldn't be served by an index).
What I found: filtering by city and price was `type: ALL`, `key: NULL`,
`Using where; Using filesort` — a scan of all 53,122 rows, 557 ms. After adding
`idx_city_price`, a **functional** index on `(LOWER(TRIM(L_City)), L_SystemPrice)`
— it has to be built on the expression, because a plain index on `L_City` is
unusable once the column is wrapped in `LOWER(TRIM())` — it dropped to 116 rows
examined, filesort gone, **557 ms → 4.3 ms**.

**"How does React state work? Why does changing a filter reset the page?"**
State changes are requests to re-render, not immediate mutations; React
re-invokes the component with the new value and runs the effects whose
dependencies changed. The page resets because it *has* to: page 3 of the old
result set may not exist in the new one, so you'd request an offset past the end
and render an empty page. `search()` sets filters and page together in one
handler, so the effect sees both at once and fires exactly one request.

**"What would you change to support 10,000 concurrent users?"**
In rough order of payoff: put a cache in front of the read path, since the
`(filters, sort, page)` tuple is a natural key and the data is near-static;
cache or drop the per-request `COUNT(*)`, which is the expensive half; move to
keyset pagination so deep offsets stop scanning; run several stateless API
instances behind a load balancer with the connection pool sized to the database
rather than to the traffic; add a read replica; and serve the built frontend and
the photos from a CDN so they never touch the API at all.

**"Describe the bug you spent the most time on."**
The stale-results flash — see the architecture section. The honest part of the
answer is that I spent most of that time in the wrong place, looking at state
resets, because the symptom looked like stale state. Logging timestamps at
request and response time is what turned it around: the responses were arriving
out of order, and the bug had nothing to do with state management.

---

## Pre-demo checklist

- [ ] **Fresh `rets_property` and `rets_openhouse` tables imported from the Team
      Lead.** Photo URLs expire — old dumps mean broken images on sold listings,
      in front of the room. *This is the one item that can't be fixed on the day.*
- [ ] Click through several sold listings and confirm images load
- [ ] Indexes present in the new tables — `SHOW INDEX FROM rets_property;`
      (re-run `backend/db/indexes.sql` after a re-import)
- [ ] `cd backend && npx jest` — 49 pass
- [ ] `cd frontend && CI=true npx react-scripts test --watchAll=false` — 123 pass
- [ ] Both servers start clean; listings page loads in the browser
- [ ] **`REACT_APP_GOOGLE_MAPS_API_KEY` set in `frontend/.env`** — without it the
      map area renders a "set the API key" message instead of the map, which is
      not the thing you want to be explaining on stage. Restart the dev server
      after setting it; CRA only reads `.env` at startup.
- [ ] A property *with* a map and one *without* coordinates both picked out in
      advance, so the graceful-degradation point is one click away
- [ ] Terminal 3 open in `backend/` for the kill-the-server moment
- [ ] Editor tabs open: `usePropertySearch.js`, `routes/properties.js`,
      `utils/pagination.js`
- [ ] Browser zoom up a step or two so the back of the room can read it
