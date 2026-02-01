import { Vector3, Mesh, Color3, SpriteManager, Sprite } from "babylonjs";
import { StandardMaterial } from "babylonjs";
import { PlayerFactory } from "../factory/PlayerFactory";

export class Player {
  readonly mesh: Mesh;
  public id: string;
  private className = "none";
  private thomasSprite: Sprite | null = null;
  private defaultScaling = new Vector3(1, 1, 1);
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
    this.defaultScaling = this.mesh.scaling.clone();
  }

  setPosition(position: Vector3) {
    this.mesh.position.copyFrom(position);
  }

  setColor(color: Color3) {
    const material = this.mesh.material;
    if (material && material instanceof StandardMaterial) {
      material.diffuseColor = color;
    }
  }

  setClassName(name: string) {
    this.className = name.trim().toLowerCase() || "none";
  }

  setClassColor(className: string) {
    const normalized = className.trim().toLowerCase();
    this.className = normalized || "none";
    this.setColor(Player.getClassColor(this.className));
  }

  getClassName() {
    return this.className;
  }

  setThomasActive(
    active: boolean,
    spriteManager?: SpriteManager,
    sprite?: { pixelWidth: number; pixelHeight: number; displayHeight: number }
  ) {
    if (active) {
      this.className = "thomas";
      this.mesh.isVisible = false;
      this.mesh.scaling.set(2, 2, 2);
      if (!this.thomasSprite && spriteManager) {
        this.thomasSprite = new Sprite("thomasSprite", spriteManager);
        const displayHeight = sprite?.displayHeight ?? 2.5;
        const ratio =
          sprite && sprite.pixelHeight > 0
            ? sprite.pixelWidth / sprite.pixelHeight
            : 1;
        this.thomasSprite.size = displayHeight;
        if ((this.thomasSprite as any).width !== undefined) {
          (this.thomasSprite as any).width = displayHeight * ratio;
        }
        if ((this.thomasSprite as any).height !== undefined) {
          (this.thomasSprite as any).height = displayHeight;
        }
      }
      if (this.thomasSprite) {
        this.thomasSprite.isVisible = true;
        this.updateThomasSpritePosition();
      }
      return;
    }

    this.mesh.isVisible = true;
    this.mesh.scaling.copyFrom(this.defaultScaling);
    if (this.thomasSprite) {
      this.thomasSprite.isVisible = false;
    }
    if (this.className === "thomas") {
      this.className = "none";
    }
  }

  updateThomasSpritePosition() {
    if (!this.thomasSprite) {
      return;
    }
    this.thomasSprite.position.x = this.mesh.position.x;
    this.thomasSprite.position.y = this.mesh.position.y + 2.75;
    this.thomasSprite.position.z = this.mesh.position.z;
  }

  static getClassColor(className: string) {
    switch (className.trim().toLowerCase()) {
      case "engineer":
        return new Color3(1, 0.9, 0);
      case "soldier":
        return new Color3(0, 0.4, 0.45);
      case "scout":
        return new Color3(1, 1, 1);
      case "thomas":
        return new Color3(1, 1, 1);
      case "none":
      default:
        return new Color3(0.2, 0.6, 1);
    }
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
