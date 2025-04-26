import { useContext, useState } from "react";
import useAxiosInstance from "../axios/instance";
import { AuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const useAuth = () => {
  const navigate = useNavigate();
  const { post } = useAxiosInstance();
  const { setUser } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const response = await post("/api/login", { email, password });

      if (response.status === 200) {
        sessionStorage.setItem(
          "@REMOTEACCESS_USERINFOS",
          JSON.stringify(response?.data?.userInfos)
        );

        setUser(response?.data?.userInfos);
        navigate("/");
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    isLoading,
  };
};

export default useAuth;
