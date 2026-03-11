import { startEarthquakeScheduler } from "../core/feeds/earthquakes/earthquake.scheduler";
import { startSpaceWeatherScheduler } from "../core/feeds/space-weather/space-weather.scheduler";
import { startVolcanoScheduler } from "../core/feeds/volcanoes/volcano.scheduler";
import { fetchAndPersistEarthquakes } from "../core/feeds/earthquakes/earthquake.service";
import {
  fetchAndPersistSolarWind,
  fetchAndPersistKpIndex,
  fetchAndPersistSpaceWeatherAlerts,
} from "../core/feeds/space-weather/space-weather.service";
import {
  fetchAndPersistElevatedVolcanoes,
  fetchAndPersistMonitoredVolcanoes,
} from "../core/feeds/volcanoes/volcano.service";
import logger from "../utils/logger.utils";

const runInitialIngests = async (): Promise<void> => {
  logger("INFO", "Running initial ingests on boot");
  try {
    await Promise.allSettled([
      fetchAndPersistEarthquakes(),
      fetchAndPersistSolarWind(),
      fetchAndPersistKpIndex(),
      fetchAndPersistSpaceWeatherAlerts(),
      fetchAndPersistElevatedVolcanoes(),
      fetchAndPersistMonitoredVolcanoes(),
    ]);
    logger("INFO", "Initial ingests complete");
  } catch (err) {
    logger("ERROR", "Initial ingest run failed", err);
  }
};

export const startAllSchedulers = (): void => {
  startEarthquakeScheduler();
  startSpaceWeatherScheduler();
  startVolcanoScheduler();
  logger("INFO", "All schedulers started");
  runInitialIngests();
};
