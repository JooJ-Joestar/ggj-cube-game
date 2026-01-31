import { Room, Client } from "@colyseus/core";
import {
  uniqueNamesGenerator,
  adjectives,
  animals
} from "unique-names-generator";
import { MyRoomState } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {
  static readonly MATCH_PLAY_STATUS_CODE = 1;
  static readonly MATCH_PAUSE_STATUS_CODE = 2;

  maxClients = 4;
  state = new MyRoomState();
  private playerNames = new Map<string, string>();
  private playerScores = new Map<string, number>();
  private playerHealth = new Map<string, number>();
  private placedCubes: Array<{
    position: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number };
  }> = [];
  private matchPlayDuration = 60;
  private matchPauseDuration = 15;
  private matchLoopAbort = false;
  private matchLoopRunning = false;
  private scoreboardInterval: ReturnType<typeof setInterval> | null = null;

  onCreate(options: any) {
    this.matchPlayDuration = this.getEnvDuration("MATCH_PLAY_TIME", 60);
    this.matchPauseDuration = this.getEnvDuration("MATCH_PAUSE_TIME", 15);
    this.runMatchLoop();
    this.startScoreboardBroadcast();

    this.onMessage("type", (client, message) => {
      //
      // handle "type" message
      //
    });

    this.onMessage("whoAmI", (client) => {
      this.replyWithName(client);
    });

    this.onMessage("whoIs", (client, message: { id?: string }) => {
      const id = message?.id;
      if (!id) {
        return;
      }
      const name = this.playerNames.get(id) ?? "Player n/a";
      client.send("whoIsResult", { id, name });
    });

    this.onMessage("playerMove", (client, message) => {
      this.broadcast("playerMoved", {
        id: client.sessionId,
        position: message.position
      });
    });

    this.onMessage(
      "quickAttack",
      (
        client,
        message: {
          position?: { x: number; y: number; z: number };
          direction?: { x: number; y: number; z: number };
          speed?: number;
          distance?: number;
        }
      ) => {
        if (!message?.position || !message?.direction) {
          return;
        }
        this.broadcast("playerQuickAttack", {
          id: client.sessionId,
          position: message.position,
          direction: message.direction,
          speed: message.speed,
          distance: message.distance
        });
      }
    );

    this.onMessage(
      "placeCube",
      (
        client,
        message: {
          position?: { x: number; y: number; z: number };
          color?: { r: number; g: number; b: number };
        }
      ) => {
        if (!message?.position || !message?.color) {
          return;
        }
        this.upsertPlacedCube(message.position, message.color);
        this.broadcast("cubePlaced", {
          id: client.sessionId,
          position: message.position,
          color: message.color
        });
      }
    );

    this.onMessage(
      "playerHealthUpdate",
      (client, message: { id?: string; health?: number }) => {
        const id = message?.id;
        if (!id || typeof message.health !== "number") {
          return;
        }
        this.playerHealth.set(id, Math.max(0, Math.round(message.health)));
        this.broadcast("playerHealthUpdate", { id, health: message.health });
      }
    );

    this.onMessage(
      "addPlayerScore",
      (client, message: { id?: string; amount?: number }) => {
        const id = message?.id;
        const amount = Number(message?.amount);
        if (!id || !Number.isFinite(amount)) {
          return;
        }
        const next = (this.playerScores.get(id) ?? 0) + Math.max(0, Math.round(amount));
        this.playerScores.set(id, next);
        this.broadcastScoreboard();
      }
    );

    this.onMessage("playerHit", (client, message: { id?: string }) => {
      const id = message?.id;
      if (!id) {
        return;
      }
      this.broadcast("playerHit", { id });
    });

    this.onMessage("respawnClient", (client, message: { id?: string }) => {
      const id = message?.id ?? client.sessionId;
      if (!id) {
        return;
      }
      this.playerHealth.set(id, 100);
      this.broadcast("playerRespawn", { id, health: 100 });
    });
  }

  async onJoin(client: Client, options: any) {
    const playerName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: " ",
      style: "capital"
    });
    this.playerNames.set(client.sessionId, playerName);
    this.playerScores.set(client.sessionId, 0);
    this.playerHealth.set(client.sessionId, 100);
    for (const [otherId, otherName] of this.playerNames.entries()) {
      if (otherId !== client.sessionId) {
        client.send("playerJoined", {
          id: otherId,
          name: otherName,
          health: this.playerHealth.get(otherId) ?? 100
        });
      }
    }
    this.broadcast("playerJoined", {
      id: client.sessionId,
      name: playerName,
      health: this.playerHealth.get(client.sessionId) ?? 100
    });
    client.send("placedCubes", { cubes: this.placedCubes });
    console.log(client.sessionId, "joined as", playerName);
  }

  onLeave(client: Client, consented: boolean) {
    this.playerNames.delete(client.sessionId);
    this.playerScores.delete(client.sessionId);
    this.playerHealth.delete(client.sessionId);
    this.broadcast("playerLeft", { id: client.sessionId });
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    this.matchLoopAbort = true;
    if (this.scoreboardInterval) {
      clearInterval(this.scoreboardInterval);
      this.scoreboardInterval = null;
    }
    console.log("room", this.roomId, "disposing...");
  }

  private async runMatchLoop() {
    if (this.matchLoopRunning) {
      return;
    }
    this.matchLoopRunning = true;
    try {
      while (!this.matchLoopAbort) {
        await this.runPhase(MyRoom.MATCH_PLAY_STATUS_CODE, this.matchPlayDuration);
        if (this.matchLoopAbort) {
          break;
        }
        await this.runPhase(MyRoom.MATCH_PAUSE_STATUS_CODE, this.matchPauseDuration);
      }
    } catch (err) {
      console.warn("Match timer loop stopped", err);
    } finally {
      this.matchLoopRunning = false;
    }
  }

  private async runPhase(statusCode: number, durationSeconds: number) {
    this.broadcast("matchStatusChange", { status: statusCode });
    const ticks = Math.max(0, Math.round(durationSeconds));
    for (let remaining = ticks; remaining >= 0; remaining--) {
      if (this.matchLoopAbort) {
        return;
      }
      this.broadcast("matchTimeChange", { time: remaining });
      if (remaining === 0) {
        break;
      }
      await this.delay(1000);
    }
  }

  private startScoreboardBroadcast() {
    this.broadcastScoreboard();
    this.scoreboardInterval = setInterval(() => {
      if (this.matchLoopAbort) {
        return;
      }
      this.broadcastScoreboard();
    }, 500);
  }

  private broadcastScoreboard() {
    const entries = Array.from(this.playerNames.entries()).map(([id, name]) => ({
      id,
      name,
      score: this.playerScores.get(id) ?? 0
    }));
    entries.sort((a, b) => b.score - a.score);
    this.broadcast("updateScoreboard", { entries });
  }

  // Scores are only updated by gameplay events; no time-based changes.

  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private getEnvDuration(key: string, fallback: number) {
    const value = Number(process.env[key]);
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return Math.round(value);
  }

  private replyWithName(client: Client) {
    const name = this.playerNames.get(client.sessionId) ?? "Player n/a";
    client.send("assignName", { name });
  }

  private upsertPlacedCube(
    position: { x: number; y: number; z: number },
    color: { r: number; g: number; b: number }
  ) {
    const key = `${position.x},${position.z}`;
    const index = this.placedCubes.findIndex(
      (cube) => `${cube.position.x},${cube.position.z}` === key
    );
    if (index >= 0) {
      this.placedCubes[index] = { position, color };
      return;
    }
    this.placedCubes.push({ position, color });
  }
}
