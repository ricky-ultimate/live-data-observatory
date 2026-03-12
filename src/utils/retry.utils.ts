import logger from "./logger.utils";

interface RetryOptions {
  retries?: number;
  delayMs?: number;
  label?: string;
  on429DelayMs?: number;
}

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> => {
  const { retries = 2, delayMs = 8000, label = "withRetry", on429DelayMs } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === retries;

      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      const waitMs = on429DelayMs && status === 429 ? on429DelayMs : delayMs;

      logger(
        "WARN",
        `[${label}] Attempt ${attempt}/${retries} failed (status: ${status ?? "unknown"})${
          isLast ? ", giving up" : `, retrying in ${waitMs}ms`
        }`
      );

      if (!isLast) await new Promise((res) => setTimeout(res, waitMs));
    }
  }

  return null;
};
