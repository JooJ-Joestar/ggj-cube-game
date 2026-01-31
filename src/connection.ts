import { Client, Room } from "colyseus.js";

type RoomWithClients<State = unknown> = Room<State> & {
  clients?: number;
};

const DEFAULT_URL = "ws://localhost:2567";

type RemotePlayerInfo = { id: string; name: string; health?: number; className?: string };
type RemotePlayerMovement = { id: string; position: { x: number; y: number; z: number } };
type MatchTimePayload = { time: number };
type ScoreboardEntry = { id: string; name: string; score: number };
type ScoreboardPayload = { entries: ScoreboardEntry[] };
type MatchStatusPayload = { status: number };
type QuickAttackPayload = {
  id: string;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  speed?: number;
  distance?: number;
};
type HealthUpdatePayload = { id: string; health: number };
type PlayerHitPayload = { id: string };
type PlayerClassPayload = { id: string; className: string };
type PlaceCubePayload = {
  id: string;
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
};
type RemoveCubePayload = {
  id: string;
  position: { x: number; y: number; z: number };
};
type PlacedCubesPayload = {
  cubes: Array<{
    position: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number };
  }>;
};

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
  private scoreboardListeners: Array<(entries: ScoreboardEntry[]) => void> = [];
  private quickAttackListeners: Array<(payload: QuickAttackPayload) => void> = [];
  private healthListeners: Array<(payload: HealthUpdatePayload) => void> = [];
  private respawnListeners: Array<(payload: HealthUpdatePayload) => void> = [];
  private hitListeners: Array<(payload: PlayerHitPayload) => void> = [];
  private classListeners: Array<(payload: PlayerClassPayload) => void> = [];
  private placeCubeListeners: Array<(payload: PlaceCubePayload) => void> = [];
  private removeCubeListeners: Array<(payload: RemoveCubePayload) => void> = [];
  private placedCubesListeners: Array<(payload: PlacedCubesPayload) => void> = [];
  private matchStatus = MatchStatusCode.Play;
  private latestScoreboard: ScoreboardEntry[] = [];
  private remotePlayerIds = new Set<string>();

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
      this.remotePlayerIds.clear();
      if (room.sessionId) {
        this.remotePlayerIds.delete(room.sessionId);
      }
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
      this.remotePlayerIds.clear();
      console.warn("Colyseus client error", err);
    });
    anyClient.onClose?.add?.(() => {
      this.connected = false;
      this.disconnectedAt = Date.now();
      this.remotePlayerIds.clear();
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
    room.onMessage("updateScoreboard", (message: ScoreboardPayload) => {
      if (Array.isArray(message.entries)) {
        this.latestScoreboard = message.entries;
        this.scoreboardListeners.forEach((listener) => listener(message.entries));
      }
    });
    room.onMessage("playerQuickAttack", (message: QuickAttackPayload) => {
      if (!message?.id || message.id === room.sessionId) {
        return;
      }
      this.quickAttackListeners.forEach((listener) => listener(message));
    });
    room.onMessage("playerHealthUpdate", (message: HealthUpdatePayload) => {
      if (!message?.id || typeof message.health !== "number") {
        return;
      }
      this.healthListeners.forEach((listener) => listener(message));
    });
    room.onMessage("playerRespawn", (message: HealthUpdatePayload) => {
      if (!message?.id || typeof message.health !== "number") {
        return;
      }
      this.respawnListeners.forEach((listener) => listener(message));
    });
    room.onMessage("playerHit", (message: PlayerHitPayload) => {
      if (!message?.id) {
        return;
      }
      this.hitListeners.forEach((listener) => listener(message));
    });
    room.onMessage("cubePlaced", (message: PlaceCubePayload) => {
      if (!message?.id) {
        return;
      }
      this.placeCubeListeners.forEach((listener) => listener(message));
    });
    room.onMessage("cubeRemoved", (message: RemoveCubePayload) => {
      if (!message?.id) {
        return;
      }
      this.removeCubeListeners.forEach((listener) => listener(message));
    });
    room.onMessage("placedCubes", (message: PlacedCubesPayload) => {
      if (!message?.cubes) {
        return;
      }
      this.placedCubesListeners.forEach((listener) => listener(message));
    });

    room.onMessage("playerJoined", (message: RemotePlayerInfo) => {
      if (message.id === room.sessionId) {
        return;
      }
      this.remotePlayerIds.add(message.id);
      this.remotePlayerJoinListeners.forEach((listener) => listener(message));
      if (message.className) {
        this.classListeners.forEach((listener) =>
          listener({ id: message.id, className: message.className as string })
        );
      }
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
      this.remotePlayerIds.delete(id);
      this.remotePlayerLeaveListeners.forEach((listener) => listener(id));
    });
    room.onMessage("playerClass", (message: PlayerClassPayload) => {
      if (!message?.id || !message.className) {
        return;
      }
      if (message.id === room.sessionId) {
        return;
      }
      this.classListeners.forEach((listener) => listener(message));
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
    if (!this.connected || !this.room) {
      return 0;
    }
    return 1 + this.remotePlayerIds.size;
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

  onPlayerClassChanged(callback: (payload: PlayerClassPayload) => void) {
    this.classListeners.push(callback);
  }

  onMatchTimeChange(callback: (seconds: number) => void) {
    this.matchTimeListeners.push(callback);
  }

  onMatchStatusChange(callback: (status: number) => void) {
    this.matchStatusListeners.push(callback);
    callback(this.matchStatus);
  }

  onScoreboardUpdate(callback: (entries: ScoreboardEntry[]) => void) {
    this.scoreboardListeners.push(callback);
    if (this.latestScoreboard.length) {
      callback(this.latestScoreboard);
    }
  }

  onRemoteQuickAttack(callback: (payload: QuickAttackPayload) => void) {
    this.quickAttackListeners.push(callback);
  }

  onPlayerHealthUpdate(callback: (payload: HealthUpdatePayload) => void) {
    this.healthListeners.push(callback);
  }

  onPlayerRespawn(callback: (payload: HealthUpdatePayload) => void) {
    this.respawnListeners.push(callback);
  }

  onPlayerHit(callback: (payload: PlayerHitPayload) => void) {
    this.hitListeners.push(callback);
  }

  onCubePlaced(callback: (payload: PlaceCubePayload) => void) {
    this.placeCubeListeners.push(callback);
  }

  onCubeRemoved(callback: (payload: RemoveCubePayload) => void) {
    this.removeCubeListeners.push(callback);
  }

  onPlacedCubes(callback: (payload: PlacedCubesPayload) => void) {
    this.placedCubesListeners.push(callback);
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

  sendQuickAttack(payload: {
    position: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
    speed: number;
    distance: number;
  }) {
    if (!this.room) {
      return;
    }
    this.room.send("quickAttack", payload);
  }

  sendPlayerClass(payload: { className: string }) {
    if (!this.room) {
      return;
    }
    this.room.send("playerClass", payload);
  }

  sendPlayerHealthUpdate(payload: { id: string; health: number }) {
    if (!this.room) {
      return;
    }
    this.room.send("playerHealthUpdate", payload);
  }

  sendAddPlayerScore(payload: { id: string; amount: number }) {
    if (!this.room) {
      return;
    }
    this.room.send("addPlayerScore", payload);
  }

  sendRespawn(payload: { id: string }) {
    if (!this.room) {
      return;
    }
    this.room.send("respawnClient", payload);
  }

  sendPlayerHit(payload: { id: string }) {
    if (!this.room) {
      return;
    }
    this.room.send("playerHit", payload);
  }

  sendPlaceCube(payload: {
    position: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number };
  }) {
    if (!this.room) {
      return;
    }
    this.room.send("placeCube", payload);
  }

  sendRemoveCube(payload: { position: { x: number; y: number; z: number } }) {
    if (!this.room) {
      return;
    }
    this.room.send("removeCube", payload);
  }
}

export const colyseusConnection = new ColyseusConnection();
