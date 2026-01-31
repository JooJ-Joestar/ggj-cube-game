import { AdvancedDynamicTexture, Control, TextBlock } from "babylonjs-gui";
import { Mesh } from "babylonjs";

export class PlayerLabel {
  private readonly label: TextBlock;
  private playerName?: string;
  private mesh: Mesh | null = null;

  constructor(gui: AdvancedDynamicTexture) {
    this.label = new TextBlock("playerLabel", "");
    this.label.color = "white";
    this.label.fontSize = 18;
    this.label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.label.height = "30px";
    this.label.width = "200px";
    this.label.linkOffsetY = -60;
    this.label.isPointerBlocker = false;
    this.label.shadowColor = "black";
    this.label.shadowBlur = 8;
    this.label.shadowOffsetX = 0;
    this.label.shadowOffsetY = 0;
    this.label.isVisible = false;
    gui.addControl(this.label);
  }

  attachToMesh(mesh: Mesh) {
    this.mesh = mesh;
    this.label.linkWithMesh(mesh);
    this.refreshVisibility();
  }

  setName(name: string) {
    if (this.playerName) {
      return;
    }
    this.playerName = name;
    this.label.text = name;
    this.refreshVisibility();
  }

  dispose() {
    this.label.dispose();
  }

  private refreshVisibility() {
    this.label.isVisible = Boolean(this.playerName && this.mesh);
  }
}
