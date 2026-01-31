import {
  AdvancedDynamicTexture,
  Button,
  StackPanel,
  Control,
  Grid
} from "babylonjs-gui";
import { Color3 } from "babylonjs";
import { PALETTE_COLORS, PaletteColor } from "../drawingTemplates/palette";

export type PlayerMode = "move" | "place" | "remove";

export class PlayerControls {
  private mode: PlayerMode = "move";
  private moveButton: Button;
  private placeButton: Button;
  private removeButton: Button;
  private paletteGrid: Grid;
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
    this.scoreboardButton = this.createScoreboardButton("Show scoreboard", () =>
      this.toggleScoreboard()
    );
    this.paletteGrid = this.createColorPalette();
    this.paletteGrid.isVisible = false;

    controlsStack.addControl(this.moveButton);
    controlsStack.addControl(this.placeButton);
    controlsStack.addControl(this.removeButton);
    controlsStack.addControl(this.paletteGrid);

    this.updateButtonStates();
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

  private createColorPalette() {
    const palette = new Grid();
    palette.width = "180px";
    palette.height = "80px";
    palette.addColumnDefinition(1 / 3);
    palette.addColumnDefinition(1 / 3);
    palette.addColumnDefinition(1 / 3);
    palette.addRowDefinition(1 / 2);
    palette.addRowDefinition(1 / 2);
    palette.isPointerBlocker = false;

    const colors: Array<{ name: string; color: Color3 }> = [
      { name: "Black", color: PALETTE_COLORS[PaletteColor.Black] },
      { name: "Yellow", color: PALETTE_COLORS[PaletteColor.Yellow] },
      { name: "Orange", color: PALETTE_COLORS[PaletteColor.Orange] },
      { name: "Blue", color: PALETTE_COLORS[PaletteColor.Blue] },
      { name: "DarkTeal", color: PALETTE_COLORS[PaletteColor.DarkTeal] },
      { name: "LightGray", color: PALETTE_COLORS[PaletteColor.LightGray] }
    ];

    colors.forEach((entry, index) => {
      const button = Button.CreateSimpleButton(`palette-${entry.name}`, "");
      button.width = "50px";
      button.height = "30px";
      button.thickness = 1;
      button.color = "white";
      button.background = this.colorToHex(entry.color);
      button.isPointerBlocker = true;
      button.onPointerUpObservable.add(() => {
        this.selectedColor = entry.color.clone();
      });
      const row = Math.floor(index / 3);
      const col = index % 3;
      palette.addControl(button, row, col);
    });

    return palette;
  }

  private setMode(mode: PlayerMode) {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.updateButtonStates();
    this.paletteGrid.isVisible = mode === "place";
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
