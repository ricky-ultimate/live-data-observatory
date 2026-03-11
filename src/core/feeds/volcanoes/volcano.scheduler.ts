import cron from "node-cron";
import {
  fetchAndPersistElevatedVolcanoes,
  fetchAndPersistMonitoredVolcanoes,
} from "./volcano.service";
import logger from "../../../utils/logger.utils";

const runElevated = async (): Promise<void> => {
  logger("INFO", "Running volcano elevated ingest job");
  try {
    await fetchAndPersistElevatedVolcanoes();
  } catch (err) {
    logger("ERROR", "Volcano elevated ingest job failed", err);
  }
};

const runMonitored = async (): Promise<void> => {
  logger("INFO", "Running volcano monitored ingest job");
  try {
    await fetchAndPersistMonitoredVolcanoes();
  } catch (err) {
    logger("ERROR", "Volcano monitored ingest job failed", err);
  }
};

export const startVolcanoScheduler = (): void => {
  cron.schedule("*/15 * * * *", runElevated);
  cron.schedule("0 */6 * * *", runMonitored);

  logger("INFO", "Volcano scheduler registered — elevated every 15min, monitored every 6h");
};
