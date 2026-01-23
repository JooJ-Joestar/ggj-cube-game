import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, Mesh } from "babylonjs";
import { ObstacleModel } from "./ObstacleModel";

export class PlayerModel {
  readonly mesh: Mesh;
  private target: Vector3 | null = null;
  private readonly obstacles: ObstacleModel[];
  private readonly maxSpeed = 5; // units per second

  constructor(scene: Scene, obstacles: ObstacleModel[]) {
    this.obstacles = obstacles;
    this.mesh = MeshBuilder.CreateBox("PlayerCube", { size: 1 }, scene);
    this.mesh.position.y = 0.5;
    const material = new StandardMaterial("playerMat", scene);
    material.diffuseColor = new Color3(0.2, 0.6, 1);
    this.mesh.material = material;
  }

  setTarget(point: Vector3) {
    this.target = point.clone();
    this.target.y = this.mesh.position.y;
  }

  update(deltaSeconds: number) {
    if (!this.target) {
      return;
    }

    const direction = this.target.subtract(this.mesh.position);
    const distance = direction.length();
    if (distance < 0.02) {
      this.target = null;
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
}
