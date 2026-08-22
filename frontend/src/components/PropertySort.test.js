import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertySort from "./PropertySort";

function renderSort(props = {}) {
  const onChange = jest.fn();
  render(<PropertySort sortBy="" sortOrder="" onChange={onChange} {...props} />);
  return { onChange };
}

describe("PropertySort", () => {
  it("defaults to the unsorted option", () => {
    renderSort();
    expect(screen.getByLabelText(/sort by/i)).toHaveValue("");
  });

  it("reflects the current sortBy/sortOrder as the selected option", () => {
    renderSort({ sortBy: "L_SystemPrice", sortOrder: "desc" });
    expect(screen.getByLabelText(/sort by/i)).toHaveValue("L_SystemPrice:desc");
  });

  it("reports the real column name and order when price low-to-high is picked", () => {
    const { onChange } = renderSort();

    userEvent.selectOptions(screen.getByLabelText(/sort by/i), "L_SystemPrice:asc");

    expect(onChange).toHaveBeenCalledWith("L_SystemPrice", "asc");
  });

  it("reports the real column name and order when price high-to-low is picked", () => {
    const { onChange } = renderSort();

    userEvent.selectOptions(screen.getByLabelText(/sort by/i), "L_SystemPrice:desc");

    expect(onChange).toHaveBeenCalledWith("L_SystemPrice", "desc");
  });

  it("reports ListingContractDate for date listed", () => {
    const { onChange } = renderSort();

    userEvent.selectOptions(screen.getByLabelText(/sort by/i), "ListingContractDate:desc");

    expect(onChange).toHaveBeenCalledWith("ListingContractDate", "desc");
  });

  it("reports empty sortBy/sortOrder when Default is re-selected", () => {
    const { onChange } = renderSort({ sortBy: "L_SystemPrice", sortOrder: "asc" });

    userEvent.selectOptions(screen.getByLabelText(/sort by/i), "");

    expect(onChange).toHaveBeenCalledWith("", "");
  });

  it("offers every sortable field from the backend whitelist, in both directions", () => {
    renderSort();
    const select = screen.getByLabelText(/sort by/i);

    for (const column of ["L_SystemPrice", "ListingContractDate", "LM_Int2_3", "L_Keyword2"]) {
      expect(select.querySelector(`option[value="${column}:asc"]`)).not.toBeNull();
      expect(select.querySelector(`option[value="${column}:desc"]`)).not.toBeNull();
    }
  });
});
