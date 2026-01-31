import { Client, Room } from "colyseus.js";

type RoomWithClients<State = unknown> = Room<State> & {
  clients?: number;
};

const DEFAULT_URL = "ws://localhost:2567";

type RemotePlayerInfo = { id: string; name: string };
type RemotePlayerMovement = { id: string; position: { x: number; y: number; z: number } };
type MatchTimePayload = { time: number };
type MatchStatusPayload = { status: number };

export enum MatchStatusCode {
  Play = 1,
  Pause = 2
}

export class ColyseusConnection {
  private client: Client | null = null;
  private room: RoomWithClients | null = null;
  private readonly serverUrl: string;
  private connected = false;
  private disconnectedAt: number | null = null;
  private playerName = "";
  private playerNameListeners: Array<(name: string) => void> = [];
  private remotePlayerJoinListeners: Array<(info: RemotePlayerInfo) => void> = [];
  private remotePlayerMoveListeners: Array<(movement: RemotePlayerMovement) => void> = [];
  private remotePlayerLeaveListeners: Array<(id: string) => void> = [];
  private matchTimeListeners: Array<(seconds: number) => void> = [];
  private matchStatusListeners: Array<(status: number) => void> = [];
  private matchStatus = MatchStatusCode.Play;

  constructor() {
    this.serverUrl = process.env.COLYSEUS_URL || DEFAULT_URL;
  }

  async connect() {
    if (this.client && this.room) {
      return this.room;
    }

    this.client = new Client(this.serverUrl);
    console.info("Connecting to Colyseus server", this.serverUrl);

    this.hookClientEvents();

    try {
      const room = (await this.client.joinOrCreate("my_room")) as RoomWithClients;
      this.room = room;
      this.connected = true;
      this.disconnectedAt = null;
      this.hookRoomEvents(room);
      room.send("whoAmI");
      console.info("Joined room", room.roomId);
      return room;
    } catch (err) {
      console.warn("Couldn't connect to room", err);
      this.client = null;
      return null;
    }
  }

  private hookClientEvents() {
    if (!this.client) return;
    const anyClient = this.client as any;
    anyClient.onOpen?.add?.(() => {
      this.connected = true;
      this.disconnectedAt = null;
      console.info("Colyseus client connected", this.serverUrl);
    });
    anyClient.onError?.add?.((err: unknown) => {
      this.connected = false;
      this.disconnectedAt = Date.now();
      console.warn("Colyseus client error", err);
    });
    anyClient.onClose?.add?.(() => {
      this.connected = false;
      this.disconnectedAt = Date.now();
      console.info("Colyseus client closed");
      this.client = null;
    });
  }

  private hookRoomEvents(room: RoomWithClients) {
    room.onLeave(() => {
      this.room = null;
      this.disconnectedAt = Date.now();
      this.connected = false;
      this.playerName = "";
    });
    room.onError((err) => {
      console.warn("Room error", err);
    });
    room.onMessage("assignName", (message: { name?: string }) => {
      if (message?.name) {
        this.setPlayerName(message.name);
      }
    });

    room.onMessage("matchTimeChange", (message: MatchTimePayload) => {
      if (typeof message.time === "number") {
        this.matchTimeListeners.forEach((listener) => listener(message.time));
      }
    });
    room.onMessage("matchStatusChange", (message: MatchStatusPayload) => {
      if (typeof message.status === "number") {
        this.matchStatus = message.status;
        this.matchStatusListeners.forEach((listener) => listener(message.status));
      }
    });

    room.onMessage("playerJoined", (message: RemotePlayerInfo) => {
      if (message.id === room.sessionId) {
        return;
      }
      this.remotePlayerJoinListeners.forEach((listener) => listener(message));
    });
    room.onMessage("playerMoved", (message: RemotePlayerMovement) => {
      if (message.id === room.sessionId) {
        return;
      }
      this.remotePlayerMoveListeners.forEach((listener) => listener(message));
    });
    room.onMessage("playerLeft", ({ id }) => {
      if (id === room.sessionId) {
        return;
      }
      this.remotePlayerLeaveListeners.forEach((listener) => listener(id));
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

  isConnected() {
    return this.connected;
  }

  getRoomName() {
    return this.room?.name ?? "n/a";
  }

  getRoomId() {
    return this.room?.roomId ?? "n/a";
  }

  getPlayerCount() {
    return this.room?.clients ?? 0;
  }

  getLastLatency() {
    if (!this.room) {
      return 0;
    }
    const transport = (this.room as any).transport;
    if (!transport?.latency) {
      return 0;
    }
    return Math.round(transport.latency);
  }

  getPlayerName() {
    return this.playerName;
  }

  getPlayerId() {
    return this.room?.sessionId ?? "n/a";
  }

  private setPlayerName(name: string) {
    if (this.playerName) {
      return;
    }
    this.playerName = name;
    this.playerNameListeners.forEach((listener) => listener(name));
  }

  onPlayerNameAssigned(callback: (name: string) => void) {
    this.playerNameListeners.push(callback);
    if (this.playerName) {
      callback(this.playerName);
    }
  }

  onRemotePlayerJoined(callback: (info: RemotePlayerInfo) => void) {
    this.remotePlayerJoinListeners.push(callback);
  }

  onRemotePlayerMoved(callback: (movement: RemotePlayerMovement) => void) {
    this.remotePlayerMoveListeners.push(callback);
  }

  onRemotePlayerLeft(callback: (id: string) => void) {
    this.remotePlayerLeaveListeners.push(callback);
  }

  onMatchTimeChange(callback: (seconds: number) => void) {
    this.matchTimeListeners.push(callback);
  }

  onMatchStatusChange(callback: (status: number) => void) {
    this.matchStatusListeners.push(callback);
    callback(this.matchStatus);
  }

  isMatchPaused() {
    return this.matchStatus === MatchStatusCode.Pause;
  }

  sendPlayerMovement(position: { x: number; y: number; z: number }) {
    if (!this.room) {
      return;
    }
    this.room.send("playerMove", { position });
  }
}

export const colyseusConnection = new ColyseusConnection();
