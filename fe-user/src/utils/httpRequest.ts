import axios from "axios";

const httpRequest = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.REACT_APP_BASE_URL ||
    "/api/",
  withCredentials: true,
});

httpRequest.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const get = async (path: string, option = {}) => {
  const response = await httpRequest.get(path, option);
  return response.data;
};

export const post = async (path: string, data = {}, option = {}) => {
  const response = await httpRequest.post(path, data, option);
  return response.data;
};

export const put = async (path: string, data = {}, option = {}) => {
  const response = await httpRequest.put(path, data, option);
  return response.data;
};

export const patch = async (path: string, data = {}, option = {}) => {
  const response = await httpRequest.patch(path, data, option);
  return response.data;
};

export const del = async (path: string, option = {}) => {
  const response = await httpRequest.delete(path, option);
  return response.data;
};

export default httpRequest;
