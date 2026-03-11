import cron from "node-cron";
import { fetchAndPersistAsteroids } from "./asteroid.service";
import logger from "../../../utils/logger.utils";

const runAsteroidIngest = async (): Promise<void> => {
  logger("INFO", "Running asteroid ingest job");
  try {
    await fetchAndPersistAsteroids();
  } catch (err) {
    logger("ERROR", "Asteroid ingest job failed", err);
  }
};

export const startAsteroidScheduler = (): void => {
  cron.schedule("0 0 * * *", runAsteroidIngest);
  logger("INFO", "Asteroid scheduler registered — polling NASA NeoWs daily at midnight UTC");
};
