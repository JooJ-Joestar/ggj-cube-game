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

    this.onMessage("playerMove", (client, message) => {
      this.broadcast("playerMoved", {
        id: client.sessionId,
        position: message.position
      });
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
    for (const [otherId, otherName] of this.playerNames.entries()) {
      if (otherId !== client.sessionId) {
        client.send("playerJoined", { id: otherId, name: otherName });
      }
    }
    this.broadcast("playerJoined", {
      id: client.sessionId,
      name: playerName
    });
    console.log(client.sessionId, "joined as", playerName);
  }

  onLeave(client: Client, consented: boolean) {
    this.playerNames.delete(client.sessionId);
    this.playerScores.delete(client.sessionId);
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
      this.incrementScores();
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

  private incrementScores() {
    for (const id of this.playerScores.keys()) {
      const existing = this.playerScores.get(id) ?? 0;
      this.playerScores.set(id, existing + 1);
    }
  }

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
}
