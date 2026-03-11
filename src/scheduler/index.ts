import { startEarthquakeScheduler } from "../core/feeds/earthquakes/earthquake.scheduler";
import { startSpaceWeatherScheduler } from "../core/feeds/space-weather/space-weather.scheduler";
import logger from "../utils/logger.utils";

export const startAllSchedulers = (): void => {
  startEarthquakeScheduler();
  startSpaceWeatherScheduler();
  logger("INFO", "All schedulers started");
};
