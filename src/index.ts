import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import { ENV } from "./constants/env";
import { ROUTES } from "./constants/routes";
import logger from "./utils/logger.utils";
import { initWebSocketServer } from "./websocket/ws.server";
import { startAllSchedulers } from "./scheduler";
import earthquakeRoutes from "./core/feeds/earthquakes/earthquake.routes";
import spaceWeatherRoutes from "./core/feeds/space-weather/space-weather.routes";
import volcanoRoutes from "./core/feeds/volcanoes/volcano.routes";
import conflictRoutes from "./core/feeds/conflict/conflict.routes";
import asteroidRoutes from "./core/feeds/asteroids/asteroid.routes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

app.use(ROUTES.EARTHQUAKES, earthquakeRoutes);
app.use(ROUTES.SPACE_WEATHER, spaceWeatherRoutes);
app.use(ROUTES.VOLCANOES, volcanoRoutes);
app.use(ROUTES.CONFLICT, conflictRoutes);
app.use(ROUTES.ASTEROIDS, asteroidRoutes);

app.get(ROUTES.BASE, (_req, res) => {
  res.status(200).json({ status: "Live Data Observatory running" });
});

const server = http.createServer(app);

initWebSocketServer(server);
startAllSchedulers();

server.listen(ENV.PORT, () => {
  logger("INFO", `Server running on port ${ENV.PORT}`);
});
