import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ListingsPage from "./ListingsPage";
import { ROUTER_FUTURE_FLAGS } from "../App";
import { fetchProperties } from "../api/client";

// The page is tested against a mocked client rather than a mocked fetch(): the
// query-string building is already covered in client.test.js, and mocking at
// this seam lets each request's resolution be controlled individually, which is
// what the out-of-order test below needs.
jest.mock("../api/client");

// PropertyCard renders a react-router Link, which throws outside a Router.
function renderPage() {
  const wrapper = ({ children }) => (
    <MemoryRouter future={ROUTER_FUTURE_FLAGS}>{children}</MemoryRouter>
  );
  return render(<ListingsPage />, { wrapper });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function property(id, address, city) {
  return {
    L_ListingID: id,
    L_Address: address,
    L_City: city,
    L_State: "OR",
    L_SystemPrice: 500000,
    L_Keyword2: 3,
    LM_Dec_3: "2.0",
    LM_Int2_3: 1800,
    L_Photos: null,
  };
}

function payload(results, total = results.length) {
  return { total, limit: 20, offset: 0, results };
}

/** A full page of distinctly-named properties, for pagination tests. */
function pageOfProperties(pageNumber, count = 20) {
  return Array.from({ length: count }, (_, i) =>
    property(`${pageNumber}-${i}`, `Property ${pageNumber}-${i}`, "Portland")
  );
}

/** Queues a deferred response per call so tests decide when each one lands. */
function queueDeferredResponses() {
  const pending = [];
  fetchProperties.mockImplementation(() => {
    const d = deferred();
    pending.push(d);
    return d.promise;
  });
  return pending;
}

/** Resolves a pending request and lets React flush the resulting state update. */
async function settle(request, value) {
  await act(async () => {
    request.resolve(value);
  });
}

function search() {
  userEvent.click(screen.getByRole("button", { name: /^search$/i }));
}

function clear() {
  userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
}

afterEach(() => {
  jest.resetAllMocks();
});

describe("ListingsPage", () => {
  it("loads every property with no filters on first render", async () => {
    fetchProperties.mockResolvedValue(payload([property("1", "1 Oak St", "Portland")]));

    renderPage();
    expect(screen.getByText(/loading properties/i)).toBeInTheDocument();

    expect(await screen.findByText("1 Oak St")).toBeInTheDocument();
    expect(fetchProperties).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it("sends only the non-empty filters when the form is submitted", async () => {
    fetchProperties.mockResolvedValue(payload([property("1", "1 Oak St", "Portland")]));

    renderPage();
    await screen.findByText("1 Oak St");

    userEvent.type(screen.getByLabelText(/city/i), "Portland");
    userEvent.selectOptions(screen.getByLabelText(/beds/i), "3");
    search();

    await waitFor(() => {
      expect(fetchProperties).toHaveBeenLastCalledWith({
        city: "Portland",
        beds: "3",
        limit: 20,
        offset: 0,
      });
    });
    // zipcode / minPrice / maxPrice / baths were left blank and must be absent.
    expect(fetchProperties).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ zipcode: expect.anything() })
    );
  });

  it("shows a helpful message when a search matches nothing", async () => {
    fetchProperties.mockResolvedValue(payload([]));

    renderPage();

    expect(await screen.findByText(/no properties found/i)).toBeInTheDocument();
  });

  it("reloads the unfiltered list when Clear Filters is clicked", async () => {
    fetchProperties.mockResolvedValue(payload([property("1", "1 Oak St", "Portland")]));

    renderPage();
    await screen.findByText("1 Oak St");

    userEvent.type(screen.getByLabelText(/city/i), "Portland");
    search();
    await waitFor(() =>
      expect(fetchProperties).toHaveBeenLastCalledWith({ city: "Portland", limit: 20, offset: 0 })
    );

    clear();
    await waitFor(() =>
      expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 0 })
    );
    expect(screen.getByLabelText(/city/i)).toHaveValue("");
  });

  it("shows the error message when the request fails", async () => {
    fetchProperties.mockRejectedValue(new Error("Unable to reach the server."));

    renderPage();

    expect(await screen.findByText("Unable to reach the server.")).toBeInTheDocument();
  });

  // Debug Challenge: search -> clear -> search used to flash the first search's
  // results because a slow earlier response could resolve after a newer one and
  // still write to state. Every response except the newest must be discarded.
  it("never renders a stale response that resolves after a newer request", async () => {
    const pending = queueDeferredResponses();

    renderPage();
    await settle(pending[0], payload([property("1", "1 Oak St", "Portland")]));

    userEvent.type(screen.getByLabelText(/city/i), "Portland");
    search(); // request 1
    clear(); // request 2
    userEvent.type(screen.getByLabelText(/city/i), "Seattle");
    search(); // request 3

    await waitFor(() => expect(pending).toHaveLength(4));

    // The first search finally answers, out of order and two searches too late.
    await settle(pending[1], payload([property("2", "99 Stale Ave", "Portland")]));
    expect(screen.queryByText("99 Stale Ave")).not.toBeInTheDocument();

    // So does the clear, which is also no longer the active request.
    await settle(pending[2], payload([property("3", "50 Cleared Rd", "Portland")]));
    expect(screen.queryByText("50 Cleared Rd")).not.toBeInTheDocument();

    // Only the newest request is allowed to render.
    await settle(pending[3], payload([property("4", "7 Pine St", "Seattle")]));
    expect(screen.getByText("7 Pine St")).toBeInTheDocument();
    expect(screen.queryByText("99 Stale Ave")).not.toBeInTheDocument();
  });

  describe("pagination", () => {
    beforeEach(() => {
      // jsdom doesn't implement scrolling; stubbed so the page-change handler
      // can be asserted on without a "not implemented" console error.
      window.scrollTo = jest.fn();
    });

    it("shows the result range and requests the next offset when a page is clicked", async () => {
      fetchProperties.mockResolvedValue(payload(pageOfProperties(1), 45));

      renderPage();
      await screen.findByText("Property 1-0");
      expect(screen.getByText("Showing 1-20 of 45 properties")).toBeInTheDocument();

      userEvent.click(screen.getByRole("button", { name: "2" }));

      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 20 })
      );
    });

    it("scrolls to the top when the page changes", async () => {
      fetchProperties.mockResolvedValue(payload(pageOfProperties(1), 45));

      renderPage();
      await screen.findByText("Property 1-0");

      userEvent.click(screen.getByRole("button", { name: "2" }));

      await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 0));
    });

    it("preserves the active filters when changing pages", async () => {
      fetchProperties.mockResolvedValue(payload(pageOfProperties(1), 45));

      renderPage();
      await screen.findByText("Property 1-0");

      userEvent.type(screen.getByLabelText(/city/i), "Portland");
      search();
      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({
          city: "Portland",
          limit: 20,
          offset: 0,
        })
      );

      userEvent.click(screen.getByRole("button", { name: "2" }));

      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({
          city: "Portland",
          limit: 20,
          offset: 20,
        })
      );
    });

    it("resets to page 1 when a new search is applied from a later page", async () => {
      fetchProperties.mockResolvedValue(payload(pageOfProperties(1), 45));

      renderPage();
      await screen.findByText("Property 1-0");

      userEvent.click(screen.getByRole("button", { name: "3" }));
      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 40 })
      );

      userEvent.type(screen.getByLabelText(/city/i), "Seattle");
      search();

      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({
          city: "Seattle",
          limit: 20,
          offset: 0,
        })
      );
    });

    it("resets to page 1 when filters are cleared from a later page", async () => {
      fetchProperties.mockResolvedValue(payload(pageOfProperties(1), 45));

      renderPage();
      await screen.findByText("Property 1-0");

      userEvent.click(screen.getByRole("button", { name: "2" }));
      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 20 })
      );

      clear();

      await waitFor(() =>
        expect(fetchProperties).toHaveBeenLastCalledWith({ limit: 20, offset: 0 })
      );
    });

    it("hides pagination controls when everything fits on one page", async () => {
      fetchProperties.mockResolvedValue(payload([property("1", "1 Oak St", "Portland")]));

      renderPage();
      await screen.findByText("1 Oak St");

      expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
    });
  });
});
