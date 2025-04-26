import axios from "axios";

const API_URL = String(import.meta.env.VITE_API_ENDPOINT);

const useAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_URL,
  });

  const get = async (endpoint) => {
    try {
      const response = await instance.get(`${API_URL}${endpoint}`, {
        params: params,
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const post = async (endpoint, data) => {
    try {
      const response = await instance.post(`${API_URL}${endpoint}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const put = async (endpoint, data) => {
    try {
      const response = await instance.put(`${API_URL}${endpoint}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    get,
    post,
    put,
  };
};

export default useAxiosInstance;
