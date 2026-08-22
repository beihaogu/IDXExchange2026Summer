import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";

function Boom({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error("kaboom");
  }
  return <p>rendered fine</p>;
}

describe("ErrorBoundary", () => {
  let consoleError;

  // React logs every caught error to console.error by design; silencing it
  // keeps the expected failures out of the test output, and asserting the
  // spy is restored keeps a real unexpected error from being hidden.
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("rendered fine")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the fallback UI instead of unmounting the whole tree", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText("rendered fine")).not.toBeInTheDocument();
  });

  it("logs the error so it is not swallowed", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(consoleError).toHaveBeenCalled();
  });

  it("re-renders the children when Try again is clicked and the error is gone", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("rendered fine")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
