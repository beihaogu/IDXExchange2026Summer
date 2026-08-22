import { Component } from "react";
import "./ErrorBoundary.css";

// Error boundaries have to be class components -- there is no hook equivalent
// of componentDidCatch. React only routes render/lifecycle errors here; event
// handlers and async rejections (the fetch failures in ListingsPage) still
// need their own try/catch, which is why this sits alongside, not instead of,
// the existing error states.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  // Runs during the render phase and must be pure -- it only swaps in the
  // fallback UI. Side effects like logging belong in componentDidCatch.
  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Render error caught by ErrorBoundary:", error, errorInfo.componentStack);
  }

  // Clearing the error re-renders children. If whatever broke is still
  // broken, the boundary simply catches again -- no worse than the first
  // failure, and it recovers from transient errors without a full reload.
  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <h2 className="error-boundary__title">Something went wrong</h2>
        <p className="error-boundary__message">
          This part of the page failed to render. You can try again, or reload if the problem
          continues.
        </p>
        <div className="error-boundary__actions">
          <button type="button" className="error-boundary__button" onClick={this.handleRetry}>
            Try again
          </button>
          <button
            type="button"
            className="error-boundary__button error-boundary__button--secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
        <details className="error-boundary__details">
          <summary>Error details</summary>
          <pre className="error-boundary__stack">{error.message}</pre>
        </details>
      </div>
    );
  }
}

export default ErrorBoundary;
