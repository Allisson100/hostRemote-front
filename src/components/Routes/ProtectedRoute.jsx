import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

const ProtectedRoute = () => {
  const { checkAuth } = useContext(AuthContext);

  const auth = checkAuth();

  console.log("auth", auth);

  return auth ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
