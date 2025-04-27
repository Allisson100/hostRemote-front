import { AuthProvider } from "./AuthContext";
import { SocketProvider } from "./SocketContext";

const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <SocketProvider>{children}</SocketProvider>
    </AuthProvider>
  );
};

export default AppProviders;
