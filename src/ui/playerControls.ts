import {
  AdvancedDynamicTexture,
  Button,
  StackPanel,
  Control,
  ColorPicker
} from "babylonjs-gui";
import { Color3 } from "babylonjs";

export type PlayerMode = "move" | "place" | "remove";

export class PlayerControls {
  private mode: PlayerMode = "move";
  private moveButton: Button;
  private placeButton: Button;
  private removeButton: Button;
  private colorButton: Button;
  private scoreboardButton: Button;
  private selectedColor = new Color3(1, 0.4, 0);
  public onModeChange: (mode: PlayerMode) => void = () => {};
  public onScoreboardToggle: (visible: boolean) => void = () => {};
  private readonly gui: AdvancedDynamicTexture;
  private scoreboardVisible = false;

  constructor(gui: AdvancedDynamicTexture) {
    this.gui = gui;
    const controlsStack = new StackPanel();
    controlsStack.width = "180px";
    controlsStack.isVertical = true;
    controlsStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    controlsStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    controlsStack.paddingTop = "16px";
    controlsStack.paddingRight = "16px";
    controlsStack.spacing = 8;
    controlsStack.isPointerBlocker = false;
    controlsStack.isHitTestVisible = false;
    gui.addControl(controlsStack);

    this.moveButton = this.createButton("Move", () => this.setMode("move"));
    this.placeButton = this.createButton("Place", () => this.setMode("place"));
    this.removeButton = this.createButton("Remove block", () => this.setMode("remove"));
    this.colorButton = this.createButton("Color", () => this.openColorWheel());
    this.colorButton.isVisible = false;
    this.scoreboardButton = this.createScoreboardButton("Show scoreboard", () =>
      this.toggleScoreboard()
    );

    controlsStack.addControl(this.moveButton);
    controlsStack.addControl(this.placeButton);
    controlsStack.addControl(this.removeButton);
    controlsStack.addControl(this.colorButton);

    this.updateButtonStates();
    this.updateColorButton();
    const scoreboardStack = new StackPanel();
    scoreboardStack.isVertical = true;
    scoreboardStack.width = "180px";
    scoreboardStack.height = "40px";
    scoreboardStack.adaptHeightToChildren = true;
    scoreboardStack.adaptWidthToChildren = true;
    scoreboardStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    scoreboardStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    scoreboardStack.paddingLeft = "16px";
    scoreboardStack.paddingBottom = "16px";
    scoreboardStack.isPointerBlocker = false;
    scoreboardStack.isHitTestVisible = false;
    gui.addControl(scoreboardStack);
    scoreboardStack.addControl(this.scoreboardButton);
  }

  getMode() {
    return this.mode;
  }

  getSelectedColor() {
    return this.selectedColor;
  }

  private async openColorWheel() {
    const result = await ColorPicker.ShowPickerDialogAsync(this.gui, {
      pickerWidth: "320px",
      pickerHeight: "360px",
      lastColor: this.colorToHex(this.selectedColor),
      savedColors: [],
      swatchLimit: 8,
      numSwatchesPerLine: 6
    });

    if (result && result.pickedColor) {
      this.selectedColor = Color3.FromHexString(result.pickedColor);
      this.updateColorButton();
    }
  }

  private updateColorButton() {
    const hex = this.colorToHex(this.selectedColor);
    this.colorButton.background = hex;
    this.colorButton.color = this.isColorDark(this.selectedColor) ? "white" : "black";
  }

  private setMode(mode: PlayerMode) {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.updateButtonStates();
    this.colorButton.isVisible = mode === "place";
    this.onModeChange(mode);
  }

  private createButton(text: string, handler: () => void) {
    const button = Button.CreateSimpleButton(text + "Btn", text);
    button.height = "40px";
    button.fontSize = 18;
    button.cornerRadius = 20;
    button.thickness = 0;
    button.background = "rgba(173, 216, 230, 0.4)";
    button.color = "white";
    button.hoverCursor = "pointer";
    button.isPointerBlocker = true;
    button.onPointerUpObservable.add(() => handler());
    return button;
  }

  private createScoreboardButton(text: string, handler: () => void) {
    const button = Button.CreateSimpleButton("scoreboardBtn", text);
    button.height = "34px";
    button.fontSize = 14;
    button.cornerRadius = 18;
    button.thickness = 0;
    button.background = "rgba(173, 216, 230, 0.5)";
    button.color = "white";
    button.hoverCursor = "pointer";
    button.width = "180px";
    button.isPointerBlocker = true;
    button.onPointerUpObservable.add(() => handler());
    return button;
  }

  private toggleScoreboard() {
    this.scoreboardVisible = !this.scoreboardVisible;
    const label = this.scoreboardVisible ? "Hide scoreboard" : "Show scoreboard";
    if (this.scoreboardButton.textBlock) {
      this.scoreboardButton.textBlock.text = label;
    }
    this.onScoreboardToggle(this.scoreboardVisible);
  }

  private isColorDark(color: Color3) {
    const value = this.colorToHex(color);
    const parsed = parseInt(value.replace("#", ""), 16);
    const r = (parsed >> 16) & 0xff;
    const g = (parsed >> 8) & 0xff;
    const b = parsed & 0xff;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  private colorToHex(color: Color3) {
    const toByte = (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      return Math.round(clamped * 255)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${toByte(color.r)}${toByte(color.g)}${toByte(color.b)}`;
  }

  private updateButtonStates() {
    this.styleToggle(this.moveButton, this.mode === "move");
    this.styleToggle(this.placeButton, this.mode === "place");
    this.styleToggle(this.removeButton, this.mode === "remove");
  }

  private styleToggle(button: Button, active: boolean) {
    button.background = active ? "rgba(173, 216, 230, 0.7)" : "rgba(173, 216, 230, 0.4)";
    button.thickness = active ? 2 : 0;
    button.color = "white";
  }
}
