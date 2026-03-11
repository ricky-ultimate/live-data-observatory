import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import logger from "../utils/logger.utils";

let wss: WebSocketServer;

export const initWebSocketServer = (server: Server): void => {
  wss = new WebSocketServer({ server });

  wss.on("connection", (socket: WebSocket) => {
    logger("INFO", "WebSocket client connected");

    socket.on("close", () => {
      logger("INFO", "WebSocket client disconnected");
    });

    socket.on("error", (err) => {
      logger("ERROR", "WebSocket client error", err.message);
    });
  });

  logger("INFO", "WebSocket server initialized");
};

export const broadcast = (source: string, data: unknown): void => {
  if (!wss) return;

  const payload = JSON.stringify({ source, data, timestamp: new Date().toISOString() });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};
