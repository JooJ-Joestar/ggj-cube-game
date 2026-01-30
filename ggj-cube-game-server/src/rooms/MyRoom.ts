import { Room, Client } from "@colyseus/core";
import {
  uniqueNamesGenerator,
  adjectives,
  animals
} from "unique-names-generator";
import { MyRoomState } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  state = new MyRoomState();
  private playerNames = new Map<string, string>();

  onCreate (options: any) {
    this.onMessage("type", (client, message) => {
      //
      // handle "type" message
      //
    });

    this.onMessage("whoAmI", (client) => {
      this.replyWithName(client);
    });
  }

  onJoin (client: Client, options: any) {
    const playerName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: " ",
      style: "capital"
    });
    this.playerNames.set(client.sessionId, playerName);
    console.log(client.sessionId, "joined as", playerName);
  }

  onLeave (client: Client, consented: boolean) {
    this.playerNames.delete(client.sessionId);
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private replyWithName(client: Client) {
    const name = this.playerNames.get(client.sessionId) ?? "Player n/a";
    client.send("assignName", { name });
  }
}
