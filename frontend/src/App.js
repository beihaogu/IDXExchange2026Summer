import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import "./App.css";

// Opts in early to the two v7 behaviours react-router v6 warns about, so the
// console stays clean and the upgrade is a version bump rather than a rewrite.
export const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

// The boundary sits inside the router, below the header, so a crashed page
// still leaves the site title and a way back. Keying it on the pathname
// remounts it on navigation -- without that, a boundary tripped on the detail
// page would keep showing its fallback after the user navigated home, since
// error state survives re-renders.
function RoutedContent() {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary key={pathname}>
      <Routes>
        <Route path="/" element={<ListingsPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter future={ROUTER_FUTURE_FLAGS}>
      <div className="App">
        <header className="App__header">
          <h1>
            <Link to="/" className="App__title-link">
              IDX Exchange
            </Link>
          </h1>
        </header>
        <main>
          <RoutedContent />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
