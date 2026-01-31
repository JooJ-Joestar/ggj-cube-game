import { Vector3, Mesh } from "babylonjs";
import { PlayerFactory } from "../factory/PlayerFactory";

export class Player {
  readonly mesh: Mesh;
  public id: string;
  private quickAttackDistance = 5;
  private quickAttackSpeed = 6;
  private quickAttackCooldownMs = 300;
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

  setQuickAttackParams(distance: number, speed: number) {
    if (Number.isFinite(distance) && distance > 0) {
      this.quickAttackDistance = distance;
    }
    if (Number.isFinite(speed) && speed > 0) {
      this.quickAttackSpeed = speed;
    }
  }

  setQuickAttackCooldownMs(cooldownMs: number) {
    if (Number.isFinite(cooldownMs) && cooldownMs >= 0) {
      this.quickAttackCooldownMs = cooldownMs;
    }
  }

  getQuickAttackDistance() {
    return this.quickAttackDistance;
  }

  getQuickAttackSpeed() {
    return this.quickAttackSpeed;
  }

  getQuickAttackCooldownMs() {
    return this.quickAttackCooldownMs;
  }
}
