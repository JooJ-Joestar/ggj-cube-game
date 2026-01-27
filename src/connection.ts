import { Client } from "colyseus.js";

const DEFAULT_URL = "ws://localhost:2567";

export class ColyseusConnection {
  private client: Client | null = null;
  private readonly serverUrl: string;
  private connected = false;
  private disconnectedAt: number | null = null;

  constructor() {
    this.serverUrl = process.env.COLYSEUS_URL || DEFAULT_URL;
  }

  connect() {
    if (this.client) {
      return this.client;
    }

    this.client = new Client(this.serverUrl);
    console.info("Connecting to Colyseus server", this.serverUrl);

    this.hookEvents();
    return this.client;
  }

  private hookEvents() {
    if (!this.client) {
      return;
    }

    const anyClient = this.client as any;

    anyClient.onOpen?.add?.(() => {
      this.connected = true;
      this.disconnectedAt = null;
      console.info("Connected to Colyseus server", this.serverUrl);
    });

    anyClient.onError?.add?.((err: unknown) => {
      this.connected = false;
      this.disconnectedAt = Date.now();
      console.warn("Colyseus connection error", err);
    });

    anyClient.onClose?.add?.(() => {
      this.connected = false;
      this.disconnectedAt = Date.now();
      console.info("Colyseus connection closed");
      this.client = null;
    });
  }

  shouldPauseUpdates(thresholdMs?: number) {
    const envThreshold =
      Number(process.env.COLYSEUS_DISCONNECT_THRESHOLD_MS) || thresholdMs || 500;
    if (this.connected) {
      return false;
    }
    if (this.disconnectedAt === null) {
      return false;
    }
    return Date.now() - this.disconnectedAt >= envThreshold;
  }

  getClient() {
    return this.client;
  }
}

export const colyseusConnection = new ColyseusConnection();
