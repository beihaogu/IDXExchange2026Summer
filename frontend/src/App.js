import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import "./App.css";

// Opts in early to the two v7 behaviours react-router v6 warns about, so the
// console stays clean and the upgrade is a version bump rather than a rewrite.
export const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

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
          <Routes>
            <Route path="/" element={<ListingsPage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
