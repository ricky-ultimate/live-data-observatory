import cron from "node-cron";
import { fetchAndPersistEarthquakes } from "./earthquake.service";
import logger from "../../../utils/logger.utils";

export const startEarthquakeScheduler = (): void => {
  cron.schedule("* * * * *", async () => {
    logger("INFO", "Running earthquake ingest job");
    try {
      await fetchAndPersistEarthquakes();
    } catch (err) {
      logger("ERROR", "Earthquake ingest job failed", err);
    }
  });

  logger("INFO", "Earthquake scheduler registered — polling every 60s");
};
