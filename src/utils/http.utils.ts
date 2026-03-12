import https from "https";
import { AxiosInstance, AxiosError } from "axios";
import axios from "axios";
import logger from "./logger.utils";

export const createHttpClient = (
  baseURL: string,
  timeoutMs = 10000,
  httpsAgent?: https.Agent,
): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: timeoutMs,
    httpsAgent,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const level = status && status < 500 ? "WARN" : "ERROR";
      const safeUrl = error.config?.url?.replace(
        /api_key=[^&]+/,
        "api_key=REDACTED",
      );
      logger(level, `HTTP request failed: ${error.message}`, {
        url: safeUrl,
        status,
      });
      return Promise.reject(error);
    },
  );

  return client;
};
