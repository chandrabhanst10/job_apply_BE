import type { Response } from "express";
import type { SSEEventType } from "./types.js";

export type { SSEEventType };

export class NotificationService {
  private readonly clients = new Map<string, Set<Response>>();

  subscribe(userId: string, res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    const userClients = this.clients.get(userId)!;
    userClients.add(res);

    this.sendToClient(res, "connected", { userId, timestamp: new Date().toISOString() });

    const pingInterval = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    res.on("close", () => {
      clearInterval(pingInterval);
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    });
  }

  send(userId: string, event: SSEEventType, data: Record<string, unknown>): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    for (const res of userClients) {
      this.sendToClient(res, event, data);
    }
  }

  broadcast(event: SSEEventType, data: Record<string, unknown>): void {
    for (const userClients of this.clients.values()) {
      for (const res of userClients) {
        this.sendToClient(res, event, data);
      }
    }
  }

  private sendToClient(res: Response, event: SSEEventType, data: Record<string, unknown>): void {
    res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
  }
}

export const notificationService = new NotificationService();
