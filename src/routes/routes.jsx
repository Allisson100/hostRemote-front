import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/Routes/ProtectedRoute";
import Login from "../pages/Login";
import Host from "../pages/Host";

export default function RouterApp() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Host />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Route>
    </Routes>
  );
}
