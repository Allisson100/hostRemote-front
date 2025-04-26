import { AuthProvider } from "./AuthContext";

const AppProviders = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export default AppProviders;
