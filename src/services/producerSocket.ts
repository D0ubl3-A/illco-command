import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { ProducerStatusEvent } from "../types";
import { config } from "../config";

export interface ProducerGateway {
  createProducerToken(channelId: string): string;
}

interface TokenPayload {
  channelId: string;
  role: "producer";
}

export function createProducerGateway(
  io: Server,
  onStatus: (event: ProducerStatusEvent) => Promise<void> | void,
  onConnection?: (channelId: string, connected: boolean) => Promise<void> | void,
  onHeartbeat?: (channelId: string) => Promise<void> | void,
  onStateRequest?: (channelId: string) => Promise<any> | any
): ProducerGateway {
  const namespace = io.of("/producer");

  const safeCall = (fn: undefined | ((...args: any[]) => Promise<void> | void), ...args: any[]) => {
    if (!fn) {
      return;
    }
    Promise.resolve(fn(...args)).catch((error) => {
      console.error("producer gateway callback error", String(error?.message || error));
    });
  };

  namespace.use((socket, next) => {
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
    if (!token) {
      return next(new Error("missing_token"));
    }
    try {
      const payload = jwt.verify(token, config.producerTokenSecret) as TokenPayload;
      if (payload.role !== "producer" || !payload.channelId) {
        return next(new Error("invalid_token"));
      }
      socket.data.channelId = payload.channelId;
      return next();
    } catch {
      return next(new Error("invalid_token"));
    }
  });

  namespace.on("connection", (socket) => {
    const channelId = String(socket.data.channelId || "");
    socket.join(`producer:${channelId}`);
    safeCall(onConnection, channelId, true);

    socket.on("producer:status", (event: ProducerStatusEvent) => {
      if (event?.channelId !== channelId || !event.messageId || !event.type) {
        return;
      }
      safeCall(onStatus, event);
    });

    socket.on("producer:heartbeat", (payload: { channelId?: string }) => {
      if (payload?.channelId && payload.channelId !== channelId) {
        return;
      }
      safeCall(onHeartbeat, channelId);
    });

    socket.on("producer:request_state", async () => {
      try {
        const state = await Promise.resolve(onStateRequest ? onStateRequest(channelId) : {});
        socket.emit(`channel:${channelId}:state`, state);
      } catch (error) {
        console.error("producer state request error", String((error as Error)?.message || error));
        socket.emit(`channel:${channelId}:state`, { error: "state_request_failed" });
      }
    });

    socket.on("disconnect", () => {
      safeCall(onConnection, channelId, false);
    });
  });

  return {
    createProducerToken(channelId: string) {
      return jwt.sign({ channelId, role: "producer" }, config.producerTokenSecret, {
        expiresIn: config.producerTokenTtlSec,
      });
    },
  };
}
