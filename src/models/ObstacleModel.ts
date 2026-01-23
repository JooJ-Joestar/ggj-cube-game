import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, Mesh } from "babylonjs";

export class ObstacleModel {
  readonly mesh: Mesh;

  constructor(
    scene: Scene,
    position: Vector3,
    size = 2,
    color = new Color3(0.8, 0.2, 0.2)
  ) {
    this.mesh = MeshBuilder.CreateBox("Obstacle", { size }, scene);
    this.mesh.position = position.clone();
    this.mesh.position.y = size / 2;
    this.mesh.renderingGroupId = 1;
    const material = new StandardMaterial("obstacleMat", scene);
    material.diffuseColor = color;
    this.mesh.material = material;
  }
}
