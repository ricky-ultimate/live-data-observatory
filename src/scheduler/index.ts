import { startEarthquakeScheduler } from "../core/feeds/earthquakes/earthquake.scheduler";
import logger from "../utils/logger.utils";

export const startAllSchedulers = (): void => {
  startEarthquakeScheduler();
  logger("INFO", "All schedulers started");
};
