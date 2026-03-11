import cron from "node-cron";
import {
  fetchAndPersistSolarWind,
  fetchAndPersistKpIndex,
  fetchAndPersistSpaceWeatherAlerts,
} from "./space-weather.service";
import logger from "../../../utils/logger.utils";

const runSolarWind = async (): Promise<void> => {
  logger("INFO", "Running space weather solar wind ingest job");
  try {
    await fetchAndPersistSolarWind();
  } catch (err) {
    logger("ERROR", "Solar wind ingest job failed", err);
  }
};

const runKpAndAlerts = async (): Promise<void> => {
  logger("INFO", "Running space weather Kp index and alerts ingest job");
  try {
    await fetchAndPersistKpIndex();
    await fetchAndPersistSpaceWeatherAlerts();
  } catch (err) {
    logger("ERROR", "Kp/alerts ingest job failed", err);
  }
};

export const startSpaceWeatherScheduler = (): void => {
  cron.schedule("*/5 * * * *", runSolarWind);
  cron.schedule("*/15 * * * *", runKpAndAlerts);

  logger("INFO", "Space weather scheduler registered — solar wind every 5min, Kp/alerts every 15min");
};
