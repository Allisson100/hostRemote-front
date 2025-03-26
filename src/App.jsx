import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Host from "./pages/Host";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Host />} />
      </Routes>
    </Router>
  );
}

export default App;
