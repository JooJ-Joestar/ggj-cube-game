import {
  AdvancedDynamicTexture,
  Control,
  TextBlock
} from "babylonjs-gui";

const DEFAULT_PREFIX = "Next match";

export class MatchTimer {
  private readonly label: TextBlock;
  private prefix = DEFAULT_PREFIX;

  constructor(gui: AdvancedDynamicTexture) {
    this.label = new TextBlock("matchTimer", `${DEFAULT_PREFIX}: --:--`);
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
    this.label.isHitTestVisible = false;
    this.label.shadowColor = "black";
    this.label.shadowBlur = 4;
    gui.addControl(this.label);
  }

  update(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const paddedMinutes = minutes.toString().padStart(2, "0");
    const paddedSeconds = remainingSeconds.toString().padStart(2, "0");
    this.label.text = `${this.prefix}: ${paddedMinutes}:${paddedSeconds}`;
  }

  setLabelPrefix(prefix: string) {
    this.prefix = prefix;
  }

  setVisible(value: boolean) {
    this.label.isVisible = value;
  }
}
