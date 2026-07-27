import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyFilters, { stripEmptyFilters } from "./PropertyFilters";

function renderFilters(props = {}) {
  const onSearch = jest.fn();
  const onClear = jest.fn();
  render(<PropertyFilters onSearch={onSearch} onClear={onClear} {...props} />);
  return { onSearch, onClear };
}

describe("PropertyFilters", () => {
  it("renders all six filter inputs, with beds and baths as dropdowns", () => {
    renderFilters();

    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/min price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/beds/i).tagName).toBe("SELECT");
    expect(screen.getByLabelText(/baths/i).tagName).toBe("SELECT");
  });

  it("submits only the filters that were filled in", () => {
    const { onSearch } = renderFilters();

    userEvent.type(screen.getByLabelText(/city/i), "Portland");
    userEvent.type(screen.getByLabelText(/min price/i), "250000");
    userEvent.selectOptions(screen.getByLabelText(/beds/i), "3");
    userEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith({
      city: "Portland",
      minPrice: "250000",
      beds: "3",
    });
  });

  it("combines every filter into a single search", () => {
    const { onSearch } = renderFilters();

    userEvent.type(screen.getByLabelText(/city/i), "Portland");
    userEvent.type(screen.getByLabelText(/zip code/i), "97201");
    userEvent.type(screen.getByLabelText(/min price/i), "250000");
    userEvent.type(screen.getByLabelText(/max price/i), "750000");
    userEvent.selectOptions(screen.getByLabelText(/beds/i), "3");
    userEvent.selectOptions(screen.getByLabelText(/baths/i), "2");
    userEvent.click(screen.getByRole("button", { name: /^search$/i }));

    expect(onSearch).toHaveBeenCalledWith({
      city: "Portland",
      zipcode: "97201",
      minPrice: "250000",
      maxPrice: "750000",
      beds: "3",
      baths: "2",
    });
  });

  it("resets the form and notifies the parent when Clear Filters is clicked", () => {
    const { onSearch, onClear } = renderFilters();

    const cityInput = screen.getByLabelText(/city/i);
    const bedsSelect = screen.getByLabelText(/beds/i);

    userEvent.type(cityInput, "Portland");
    userEvent.selectOptions(bedsSelect, "3");
    userEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(cityInput).toHaveValue("");
    expect(bedsSelect).toHaveValue("");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSearch).not.toHaveBeenCalled();
  });
});

describe("stripEmptyFilters", () => {
  it("drops empty values and trims the rest", () => {
    expect(
      stripEmptyFilters({
        city: "  Portland  ",
        zipcode: "",
        minPrice: "250000",
        maxPrice: "",
        beds: "",
        baths: "2",
      })
    ).toEqual({ city: "Portland", minPrice: "250000", baths: "2" });
  });
});
