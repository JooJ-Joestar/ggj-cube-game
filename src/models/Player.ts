import { Vector3, Mesh } from "babylonjs";
import { PlayerFactory } from "../factory/PlayerFactory";

export class Player {
  readonly mesh: Mesh;
  public id: string;
  constructor(factory: PlayerFactory, id: string, public isLocal: boolean) {
    this.id = id;
    this.mesh = factory.createPlayerMesh(1, undefined, isLocal ? "LocalPlayer" : `RemotePlayer-${id}`);
  }

  setPosition(position: Vector3) {
    this.mesh.position.copyFrom(position);
  }

  setId(id: string) {
    this.id = id;
  }
}
