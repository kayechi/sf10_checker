import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tables from "./pages/Tables";
import Printables from "./pages/Printables";
import Imports from "./pages/Imports";
import Logs from "./pages/Logs";
import "./App.css";

function App() {
  useEffect(() => {
    // Clear all localStorage on app startup
    localStorage.clear();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tables" element={<Tables />} />
          <Route path="printables" element={<Printables />} />
          <Route path="imports" element={<Imports />} />
          <Route path="logs" element={<Logs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
