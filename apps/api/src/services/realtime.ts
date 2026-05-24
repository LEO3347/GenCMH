import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "../config.js";

let io: Server | null = null;

export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: [config.webOrigin, "http://localhost:3000", "http://localhost:8081"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("join:event", (eventId: string) => socket.join(`event:${eventId}`));
    socket.on("join:admin", () => socket.join("admin"));
    socket.on("join:user", (userId: string) => socket.join(`user:${userId}`));
  });

  return io;
}

export function emitEvent(eventId: string, eventName: string, payload: unknown) {
  io?.to(`event:${eventId}`).emit(eventName, payload);
  io?.to("admin").emit(eventName, payload);
}

export function emitUser(userId: string, eventName: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(eventName, payload);
}
