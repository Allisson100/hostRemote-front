import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(null);

  const checkAuth = () => {
    const getUserInfos = sessionStorage.getItem("@REMOTEACCESS_USERINFOS");
    if (getUserInfos) {
      const userInfos = JSON.parse(getUserInfos);

      if (userInfos?.isUserBlocked) {
        return false;
      } else {
        setUser(userInfos);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const isAuthenticated = checkAuth();

    setAuthChecked(isAuthenticated);
  }, []);

  if (authChecked === null) {
    return <div>Caregando ...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
