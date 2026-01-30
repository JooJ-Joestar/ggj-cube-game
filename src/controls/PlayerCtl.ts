import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scene,
  Vector3,
  Mesh,
  LinesMesh
} from "babylonjs";
import { Obstacle } from "../models/Obstacle";
import { colyseusConnection } from "../connection";

export class PlayerCtl {
  readonly mesh: Mesh;
  private target: Vector3 | null = null;
  private readonly obstacles: Obstacle[];
  private readonly maxSpeed = 3; // units per second
  private pathLine: LinesMesh | null = null;
  private pathPoints: Vector3[] = [];
  private currentSegmentIndex = 0;
  private destinationCallback: ((position: Vector3) => void) | null = null;

  constructor(scene: Scene, obstacles: Obstacle[]) {
    this.obstacles = obstacles;
    this.mesh = MeshBuilder.CreateBox("PlayerCube", { size: 1 }, scene);
    this.mesh.renderingGroupId = 1;
    this.mesh.position.y = 0.5;
    const material = new StandardMaterial("playerMat", scene);
    material.diffuseColor = new Color3(0.2, 0.6, 1);
    this.mesh.material = material;
  }

  setTarget(point: Vector3) {
    const snappedPoint = point.clone();
    snappedPoint.x = Math.round(snappedPoint.x);
    snappedPoint.z = Math.round(snappedPoint.z);
    snappedPoint.y = this.mesh.position.y;
    this.target = snappedPoint;
    this.pathPoints = this.buildPath(this.mesh.position.clone(), this.target);
    this.currentSegmentIndex = 1;
    this.target = this.pathPoints[this.pathPoints.length - 1].clone();
    this.showPath(this.pathPoints);
  }

  setDestinationCallback(callback: (position: Vector3) => void) {
    this.destinationCallback = callback;
  }

  update(deltaSeconds: number) {
    if (colyseusConnection.shouldPauseUpdates()) {
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
    const moveDistance = Math.min(this.maxSpeed * deltaSeconds, distance);
    const nextPosition = this.mesh.position.add(direction.scale(moveDistance));

    if (this.collidesWithObstacle(nextPosition)) {
      this.target = null;
      return;
    }

    this.mesh.position = nextPosition;
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
