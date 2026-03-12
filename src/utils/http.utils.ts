import axios, { AxiosInstance, AxiosError } from "axios";
import logger from "./logger.utils";

export const createHttpClient = (
  baseURL: string,
  timeoutMs = 10000,
): AxiosInstance => {
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
      const status = error.response?.status;
      const level = status && status < 500 ? "WARN" : "ERROR";
      logger(level, `HTTP request failed: ${error.message}`, {
        url: error.config?.url,
        status,
      });
      return Promise.reject(error);
    },
  );

  return client;
};
