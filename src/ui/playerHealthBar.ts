import { AdvancedDynamicTexture, Control, Rectangle } from "babylonjs-gui";
import { Mesh } from "babylonjs";

export class PlayerHealthBar {
  private readonly container: Rectangle;
  private readonly fill: Rectangle;
  private maxHealth = 100;

  constructor(gui: AdvancedDynamicTexture) {
    this.container = new Rectangle("healthBarContainer");
    this.container.width = "80px";
    this.container.height = "10px";
    this.container.thickness = 1;
    this.container.color = "white";
    this.container.background = "rgba(0, 0, 0, 0.6)";
    this.container.isPointerBlocker = false;
    this.container.isHitTestVisible = false;
    this.container.linkOffsetY = -75;
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

    this.fill = new Rectangle("healthBarFill");
    this.fill.thickness = 0;
    this.fill.background = "rgba(80, 220, 100, 0.9)";
    this.fill.height = "100%";
    this.fill.width = "100%";
    this.fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.container.addControl(this.fill);

    gui.addControl(this.container);
  }

  attachToMesh(mesh: Mesh) {
    this.container.linkWithMesh(mesh);
  }

  setMaxHealth(value: number) {
    if (Number.isFinite(value) && value > 0) {
      this.maxHealth = value;
    }
  }

  setHealth(value: number) {
    const clamped = Math.max(0, Math.min(this.maxHealth, value));
    const ratio = this.maxHealth === 0 ? 0 : clamped / this.maxHealth;
    this.fill.width = `${Math.round(ratio * 100)}%`;
  }

  dispose() {
    this.container.dispose();
  }
}
