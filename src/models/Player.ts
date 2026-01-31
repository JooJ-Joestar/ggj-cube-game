import { Vector3, Mesh } from "babylonjs";
import { StandardMaterial } from "babylonjs";
import { PlayerFactory } from "../factory/PlayerFactory";

export class Player {
  readonly mesh: Mesh;
  public id: string;
  private quickAttackDistance = 5;
  private quickAttackSpeed = 12;
  private quickAttackCooldownMs = 300;
  private quickAttackDamage = 20;
  private health = 100;
  private damageCooldownTime = 1;
  private invincibleUntilMs = 0;
  private lastDamageAtMs = 0;
  private minDamageIntervalMs = 100;
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

  getQuickAttackDamage() {
    return this.quickAttackDamage;
  }

  setQuickAttackDamage(damage: number) {
    if (Number.isFinite(damage) && damage >= 0) {
      this.quickAttackDamage = damage;
    }
  }

  getHealth() {
    return this.health;
  }

  setHealth(value: number) {
    if (!Number.isFinite(value)) {
      return;
    }
    this.health = Math.max(0, Math.round(value));
  }

  getDamageCooldownTime() {
    return this.damageCooldownTime;
  }

  setDamageCooldownTime(seconds: number) {
    if (Number.isFinite(seconds) && seconds >= 0) {
      this.damageCooldownTime = seconds;
    }
  }

  setInvincibleForSeconds(seconds: number) {
    const ms = Math.max(0, seconds) * 1000;
    this.invincibleUntilMs = performance.now() + ms;
    this.setMeshOpacity(0.5);
  }

  isInvincible() {
    return performance.now() < this.invincibleUntilMs;
  }

  updateInvincibility() {
    if (this.isInvincible()) {
      this.setMeshOpacity(0.5);
      return;
    }
    this.setMeshOpacity(1);
  }

  applyDamage(amount: number) {
    const now = performance.now();
    if (now - this.lastDamageAtMs < this.minDamageIntervalMs) {
      return 0;
    }
    const damage = Math.max(0, Math.round(amount));
    if (damage === 0) {
      return 0;
    }
    const next = Math.max(0, this.health - damage);
    const applied = this.health - next;
    this.health = next;
    this.lastDamageAtMs = now;
    return applied;
  }

  private setMeshOpacity(value: number) {
    const material = this.mesh.material;
    if (material && material instanceof StandardMaterial) {
      material.alpha = Math.max(0, Math.min(1, value));
    }
  }
}
