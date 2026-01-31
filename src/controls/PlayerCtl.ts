import {
  MeshBuilder,
  Color3,
  Scene,
  Vector3,
  Mesh,
  LinesMesh,
  StandardMaterial
} from "babylonjs";
import { Obstacle } from "../models/Obstacle";
import { colyseusConnection } from "../connection";
import { PlayerFactory } from "../factory/PlayerFactory";
import { Player } from "../models/Player";
import { drawingTemplates } from "../drawingTemplates";
import { DrawingTemplate } from "../drawingTemplates/types";

type TemplateTransform = {
  flipX: boolean;
  flipZ: boolean;
};
import { EMPTY_CELL, PaletteColor } from "../drawingTemplates/palette";

type DrawingAccess = {
  getColorAt: (x: number, z: number) => PaletteColor | undefined;
  hasCubeAt: (x: number, z: number) => boolean;
  removeCubeAt: (position: Vector3) => void;
};

export class PlayerCtl extends Player {
  private target: Vector3 | null = null;
  private readonly obstacles: Obstacle[];
  private readonly baseMaxSpeed = 8; // units per second
  private speedBoostUntilMs = 0;
  private speedBoostMultiplier = 1;
  private readonly redbullSpeedMultiplier = this.getEnvNumber(
    "DRAWING_REDBULL_SPEED_MULTIPLIER",
    2
  );
  private readonly redbullDurationSeconds = this.getEnvNumber(
    "DRAWING_REDBULL_DURATION_SECONDS",
    10
  );
  private readonly scoutSpeedMultiplier = this.getEnvNumber(
    "DRAWING_SCOUT_SPEED_MULTIPLIER",
    2
  );
  private readonly scoutProjectileSpeedMultiplier = this.getEnvNumber(
    "DRAWING_SCOUT_PROJECTILE_SPEED_MULTIPLIER",
    2
  );
  private readonly scoutProjectileDistanceMultiplier = this.getEnvNumber(
    "DRAWING_SCOUT_PROJECTILE_DISTANCE_MULTIPLIER",
    1.5
  );
  private readonly scoutSpecialSpeedMultiplier = this.getEnvNumber(
    "DRAWING_SCOUT_SPECIAL_SPEED_MULTIPLIER",
    3
  );
  private readonly scoutSpecialDistanceMultiplier = this.getEnvNumber(
    "DRAWING_SCOUT_SPECIAL_DISTANCE_MULTIPLIER",
    3
  );
  private readonly defaultSpawnClass = this.getEnvString("DEFAULT_SPAWN_CLASS", "none");
  private scoutApplied = false;
  private baseColor: Color3;
  private scoutBaseQuickAttackSpeed: number | null = null;
  private scoutBaseQuickAttackDistance: number | null = null;
  private pathLine: LinesMesh | null = null;
  private pathPoints: Vector3[] = [];
  private currentSegmentIndex = 0;
  private destinationCallback: ((position: Vector3) => void) | null = null;
  private lastMoveDirection = new Vector3(0, 0, 1);
  private drawingAccess: DrawingAccess | null = null;

  constructor(factory: PlayerFactory, obstacles: Obstacle[], id = "") {
    super(factory, id, true);
    this.obstacles = obstacles;
    const material = this.mesh.material;
    if (material && material instanceof StandardMaterial) {
      this.baseColor = material.diffuseColor.clone();
    } else {
      this.baseColor = new Color3(0.2, 0.6, 1);
    }
    this.scoutBaseQuickAttackSpeed = this.getQuickAttackSpeed();
    this.scoutBaseQuickAttackDistance = this.getQuickAttackDistance();
    this.applySpawnClass(this.defaultSpawnClass);
  }

  isScoutApplied() {
    return this.scoutApplied;
  }

  getScoutSpecialMultipliers() {
    return {
      speed: this.scoutSpecialSpeedMultiplier,
      distance: this.scoutSpecialDistanceMultiplier
    };
  }

  setTarget(point: Vector3) {
    const snappedPoint = point.clone();
    snappedPoint.x = Math.round(snappedPoint.x);
    snappedPoint.z = Math.round(snappedPoint.z);
    snappedPoint.y = this.mesh.position.y;
    if (colyseusConnection.isMatchPaused()) {
      return;
    }
    this.target = snappedPoint;
    this.pathPoints = this.buildPath(this.mesh.position.clone(), this.target);
    this.currentSegmentIndex = 1;
    this.target = this.pathPoints[this.pathPoints.length - 1].clone();
    this.showPath(this.pathPoints);
  }

  setDestinationCallback(callback: (position: Vector3) => void) {
    this.destinationCallback = callback;
  }

  setDrawingAccess(access: DrawingAccess) {
    this.drawingAccess = access;
  }

  update(deltaSeconds: number) {
    if (colyseusConnection.shouldPauseUpdates()) {
      return;
    }
    if (colyseusConnection.isMatchPaused()) {
      return;
    }
    if (this.pathPoints.length === 0 || this.currentSegmentIndex >= this.pathPoints.length) {
      return;
    }

    const goal = this.pathPoints[this.currentSegmentIndex];
    const direction = goal.subtract(this.mesh.position);
    const distance = direction.length();
    if (distance < 0.02) {
      this.currentSegmentIndex++;
      if (this.currentSegmentIndex >= this.pathPoints.length) {
        this.clearPathLine();
        this.target = null;
        this.destinationCallback?.(this.mesh.position.clone());
      }
      return;
    }

    direction.normalize();
    this.lastMoveDirection = direction.clone();
    const now = performance.now();
    const speedMultiplier = now < this.speedBoostUntilMs ? this.speedBoostMultiplier : 1;
    const scoutMultiplier = this.scoutApplied ? this.scoutSpeedMultiplier : 1;
    const moveDistance = Math.min(
      this.baseMaxSpeed * scoutMultiplier * speedMultiplier * deltaSeconds,
      distance
    );
    const nextPosition = this.mesh.position.add(direction.scale(moveDistance));

      if (this.collidesWithObstacle(nextPosition)) {
        this.target = null;
        return;
      }

    this.mesh.position = nextPosition;
  }

  stopMovement() {
    this.target = null;
    this.pathPoints = [];
    this.currentSegmentIndex = 0;
    this.clearPathLine();
  }

  getFacingDirection() {
    if (this.lastMoveDirection.lengthSquared() < 0.0001) {
      return new Vector3(0, 0, 1);
    }
    return this.lastMoveDirection.clone();
  }

  checkDrawingsAt(position: Vector3) {
    if (!this.drawingAccess) {
      return;
    }
    const baseX = Math.round(position.x);
    const baseZ = Math.round(position.z);
    for (const template of drawingTemplates) {
      for (let anchorX = baseX - (template.width - 1); anchorX <= baseX; anchorX++) {
        for (let anchorZ = baseZ - (template.height - 1); anchorZ <= baseZ; anchorZ++) {
          const transforms: TemplateTransform[] = [
            { flipX: false, flipZ: false },
            { flipX: true, flipZ: false },
            { flipX: false, flipZ: true },
            { flipX: true, flipZ: true },
          ];
          for (const transform of transforms) {
            if (this.matchesTemplateAt(anchorX, anchorZ, template, transform)) {
              this.spawnEntity(template, anchorX, anchorZ, transform);
              return;
            }
          }
        }
      }
    }
  }

  private matchesTemplateAt(
    anchorX: number,
    anchorZ: number,
    template: DrawingTemplate,
    transform: TemplateTransform,
  ) {
    if (!this.drawingAccess) {
      return false;
    }
    const { width, height, cells } = template;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const srcCol = transform.flipX ? width - 1 - col : col;
        const srcRow = transform.flipZ ? height - 1 - row : row;
        const expected = cells[srcRow][srcCol];
        const x = anchorX + col;
        const z = anchorZ + row;
        const actual = this.drawingAccess.getColorAt(x, z);
        if (expected === EMPTY_CELL) {
          if (actual !== undefined) {
            return false;
          }
        } else if (actual !== expected) {
          return false;
        }
      }
    }
    for (let row = -1; row <= height; row++) {
      for (let col = -1; col <= width; col++) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
          continue;
        }
        const x = anchorX + col;
        const z = anchorZ + row;
        if (this.drawingAccess.hasCubeAt(x, z)) {
          return false;
        }
      }
    }
    return true;
  }

  private spawnEntity(
    template: DrawingTemplate,
    anchorX: number,
    anchorZ: number,
    transform: TemplateTransform,
  ) {
    if (!this.drawingAccess) {
      return;
    }
    if (template.name === "redbull") {
      this.applySpeedBoost(this.redbullSpeedMultiplier, this.redbullDurationSeconds);
    }
    if (template.name === "scout") {
      this.applyScoutBoost();
    }
    if (template.name === "engineer" || template.name === "soldier") {
      this.resetScoutBoost();
    }
    for (let row = 0; row < template.height; row++) {
      for (let col = 0; col < template.width; col++) {
        const srcCol = transform.flipX ? template.width - 1 - col : col;
        const srcRow = transform.flipZ ? template.height - 1 - row : row;
        if (template.cells[srcRow][srcCol] === EMPTY_CELL) {
          continue;
        }
        const position = new Vector3(anchorX + col, 0, anchorZ + row);
        this.drawingAccess.removeCubeAt(position);
      }
    }
  }

  private applySpeedBoost(multiplier: number, durationSeconds: number) {
    const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
    const safeDuration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
    this.speedBoostMultiplier = safeMultiplier;
    this.speedBoostUntilMs = performance.now() + safeDuration * 1000;
  }

  private applyScoutBoost() {
    if (this.scoutApplied) {
      return;
    }
    this.scoutApplied = true;
    this.setColor(Color3.White());
    const boostedSpeed =
      (this.scoutBaseQuickAttackSpeed ?? this.getQuickAttackSpeed()) *
      this.scoutProjectileSpeedMultiplier;
    const boostedDistance =
      (this.scoutBaseQuickAttackDistance ?? this.getQuickAttackDistance()) *
      this.scoutProjectileDistanceMultiplier;
    this.setQuickAttackParams(boostedDistance, boostedSpeed);
  }

  private resetScoutBoost() {
    if (!this.scoutApplied) {
      return;
    }
    this.scoutApplied = false;
    this.setColor(this.baseColor);
    this.setQuickAttackParams(
      this.scoutBaseQuickAttackDistance ?? this.getQuickAttackDistance(),
      this.scoutBaseQuickAttackSpeed ?? this.getQuickAttackSpeed()
    );
  }

  applySpawnClass(className: string) {
    const normalized = className.trim().toLowerCase();
    if (normalized === "scout") {
      this.applyScoutBoost();
      return;
    }
    if (normalized === "engineer" || normalized === "soldier" || normalized === "none") {
      this.resetScoutBoost();
      return;
    }
    this.resetScoutBoost();
  }

  private getEnvNumber(key: string, fallback: number) {
    const raw = process.env[key];
    if (raw === undefined) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private getEnvString(key: string, fallback: string) {
    const raw = process.env[key];
    if (raw === undefined) {
      return fallback;
    }
    return raw.trim() || fallback;
  }

  private collidesWithObstacle(nextPosition: Vector3) {
    const clearance = 1.5;
    return this.obstacles.some((obstacle) =>
      nextPosition.subtract(obstacle.mesh.position).length() < clearance
    );
  }

  private buildPath(start: Vector3, end: Vector3) {
    const path = [start.clone()];
    const clearance = 1.5;
    const collisions = this.obstacles
      .map((obstacle) => {
        const distance = obstacle.mesh.position.subtract(start).length();
        return { obstacle, distance };
      })
      .filter(({ obstacle }) =>
        this.lineIntersectsObstacle(start, end, obstacle, clearance)
      )
      .sort((a, b) => a.distance - b.distance);

    for (const { obstacle } of collisions) {
      const obstaclePos = obstacle.mesh.position.clone();
      const offset = start.subtract(obstaclePos);
      let perp = new Vector3(-offset.z, 0, offset.x);
      if (perp.length() < 0.001) {
        perp = new Vector3(1, 0, 0);
      }
      perp = perp.normalize();

      const obstacleRadius =
        obstacle.mesh.getBoundingInfo().boundingBox.extendSize.length();
      const avoidanceDistance = clearance + obstacleRadius + 0.25;
      const waypoint = obstaclePos.add(perp.scale(avoidanceDistance));
      waypoint.y = start.y;
      path.push(waypoint);
    }

    path.push(end.clone());
    return path;
  }

  private lineIntersectsObstacle(
    start: Vector3,
    end: Vector3,
    obstacle: Obstacle,
    clearance: number
  ) {
    const dir = end.subtract(start);
    const lengthSq = dir.lengthSquared();
    if (lengthSq === 0) {
      return false;
    }

    const toObstacle = obstacle.mesh.position.subtract(start);
    const t = Math.max(0, Math.min(1, toObstacle.dot(dir) / lengthSq));
    const closest = start.add(dir.scale(t));
    return closest.subtract(obstacle.mesh.position).length() < clearance;
  }

  private showPath(path: Vector3[]) {
    if (this.pathLine) {
      this.pathLine.dispose();
    }

    this.pathLine = MeshBuilder.CreateLines(
      "playerPath",
      { points: path, updatable: false },
      this.mesh.getScene()
    );
    this.pathLine.color = Color3.Red();
  }

  private clearPathLine() {
    if (this.pathLine) {
      this.pathLine.dispose();
      this.pathLine = null;
    }
  }
}
