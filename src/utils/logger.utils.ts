type LogLevel = "INFO" | "WARN" | "ERROR";

const logger = (level: LogLevel, message: string, meta?: unknown): void => {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;

  if (meta !== undefined) {
    console.log(base, meta);
  } else {
    console.log(base);
  }
};

export default logger;
