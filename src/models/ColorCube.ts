import { MeshBuilder, StandardMaterial, Color3, Scene, Vector3, Mesh } from "babylonjs";

export class ColorCube {
  readonly mesh: Mesh;

  constructor(scene: Scene, position: Vector3, color: Color3) {
    this.mesh = MeshBuilder.CreateBox("ColorCube", { size: 1 }, scene);
    this.mesh.position = position.clone();
    this.mesh.position.y = 0.5;
    this.mesh.renderingGroupId = 1;
    const material = new StandardMaterial(`colorCubeMat-${color.toHexString()}`, scene);
    material.diffuseColor = color;
    material.emissiveColor = color.scale(0.3);
    this.mesh.material = material;
  }
}
