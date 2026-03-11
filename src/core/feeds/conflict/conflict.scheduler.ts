import cron from "node-cron";
import {
  fetchAndPersistConflictArticles,
  fetchAndPersistConflictGeo,
} from "./conflict.service";
import logger from "../../../utils/logger.utils";

const runConflictIngest = async (): Promise<void> => {
  logger("INFO", "Running conflict ingest job");
  try {
    await fetchAndPersistConflictArticles("15min");
    await fetchAndPersistConflictGeo("15min");
  } catch (err) {
    logger("ERROR", "Conflict ingest job failed", err);
  }
};

export const startConflictScheduler = (): void => {
  cron.schedule("*/15 * * * *", runConflictIngest);
  logger("INFO", "Conflict scheduler registered — polling GDELT every 15min");
};
