import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter as Router } from "react-router-dom";
import AppProviders from "./contexts/index.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <AppProviders>
        <App />
      </AppProviders>
    </Router>
  </StrictMode>
);
