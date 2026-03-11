import axios, { AxiosInstance, AxiosError } from "axios";
import logger from "./logger.utils";

export const createHttpClient = (baseURL: string, timeoutMs = 10000): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      logger("ERROR", `HTTP request failed: ${error.message}`, {
        url: error.config?.url,
        status: error.response?.status,
      });
      return Promise.reject(error);
    }
  );

  return client;
};
