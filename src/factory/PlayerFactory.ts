import { MeshBuilder, StandardMaterial, Color3, Scene, Mesh } from "babylonjs";

export class PlayerFactory {
  private readonly defaultColor = new Color3(0.2, 0.6, 1);
  private readonly meshSize = 1;

  constructor(private scene: Scene) {}

  createPlayerMesh(size = this.meshSize, color = this.defaultColor, name = "PlayerCube"): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { size }, this.scene);
    mesh.renderingGroupId = 1;
    mesh.position.y = size / 2;
    const material = new StandardMaterial(`${name}Mat`, this.scene);
    material.diffuseColor = color;
    mesh.material = material;
    return mesh;
  }
}
