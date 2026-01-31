import {
  AdvancedDynamicTexture,
  Control,
  TextBlock
} from "babylonjs-gui";

export class MatchTimer {
  private readonly label: TextBlock;

  constructor(gui: AdvancedDynamicTexture) {
    this.label = new TextBlock("matchTimer", "Time left: --:--");
    this.label.fontSize = 20;
    this.label.fontFamily = "Consolas";
    this.label.color = "white";
    this.label.outlineWidth = 3;
    this.label.outlineColor = "black";
    this.label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.label.paddingTop = "8px";
    this.label.isPointerBlocker = false;
    this.label.shadowColor = "black";
    this.label.shadowBlur = 4;
    gui.addControl(this.label);
  }

  update(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const paddedMinutes = minutes.toString().padStart(2, "0");
    const paddedSeconds = remainingSeconds.toString().padStart(2, "0");
    this.label.text = `Time left: ${paddedMinutes}:${paddedSeconds}`;
  }

  setVisible(value: boolean) {
    this.label.isVisible = value;
  }
}
