import { Color3, Scene } from "babylonjs";
import {
  AdvancedDynamicTexture,
  Button,
  StackPanel,
  Control,
  ColorPicker,
  TextBlock,
  Rectangle
} from "babylonjs-gui";
import { ColyseusConnection } from "./connection";

export type PlayerMode = "move" | "place";

export class GameUI {
  private mode: PlayerMode = "move";
  private gui: AdvancedDynamicTexture;
  private moveButton: Button;
  private placeButton: Button;
  private colorButton: Button;
  private selectedColor = new Color3(1, 0.4, 0);
  private debugInfoPanel!: StackPanel;
  private roomInfoText!: TextBlock;
  private playerCountText!: TextBlock;
  private latencyText!: TextBlock;
  public onModeChange: (mode: PlayerMode) => void = () => {};
  private readonly connection: ColyseusConnection;

  constructor(scene: Scene, connection: ColyseusConnection) {
    this.gui = AdvancedDynamicTexture.CreateFullscreenUI("game-ui", true, scene as any);
    this.gui.idealHeight = 720;

    const rightBtnsStack = new StackPanel();
    rightBtnsStack.width = "180px";
    rightBtnsStack.isVertical = true;
    rightBtnsStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    rightBtnsStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    rightBtnsStack.paddingTop = "16px";
    rightBtnsStack.paddingRight = "16px";
    rightBtnsStack.spacing = 8;
    this.gui.addControl(rightBtnsStack);

    this.connection = connection;
    this.moveButton = this.createButton("Move", () => this.setMode("move"));
    this.placeButton = this.createButton("Place", () => this.setMode("place"));
    this.colorButton = this.createButton("Color", () => this.openColorWheel());
    this.colorButton.isVisible = false;

    rightBtnsStack.addControl(this.moveButton);
    rightBtnsStack.addControl(this.placeButton);
    rightBtnsStack.addControl(this.colorButton);

    this.updateButtonStates();
    this.updateColorButton();
    this.createDebugInfo();
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
    this.onModeChange(mode);
    this.updateButtonStates();
    this.colorButton.isVisible = mode === "place";
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
    button.onPointerUpObservable.add(() => handler());
    return button;
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
  }

  private styleToggle(button: Button, active: boolean) {
    button.background = active ? "rgba(173, 216, 230, 0.7)" : "rgba(173, 216, 230, 0.4)";
    button.thickness = active ? 2 : 0;
    button.color = "white";
  }

  private createDebugInfo() {
    const panelSize = "200px";
    const fontFamily = "FreeMono";
    const fontSize = 10;
    const fontHeight = "10px";

    const debugGroup = new StackPanel();
    debugGroup.width = panelSize;
    debugGroup.isVertical = true;
    debugGroup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    debugGroup.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    debugGroup.spacing = 6;
    debugGroup.zIndex = 10;
    debugGroup.background = "rgba(0, 0, 0, 0.75)";
    this.gui.addControl(debugGroup);

    this.debugInfoPanel = new StackPanel();
    this.debugInfoPanel.isVertical = true;
    this.debugInfoPanel.width = panelSize;
    this.debugInfoPanel.adaptHeightToChildren = true;
    this.debugInfoPanel.adaptWidthToChildren = true;
    this.debugInfoPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.debugInfoPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.debugInfoPanel.paddingTop = "4px";
    this.debugInfoPanel.spacing = 4;
    this.debugInfoPanel.paddingLeft = "8px";
    this.debugInfoPanel.paddingRight = "8px";
    this.debugInfoPanel.isPointerBlocker = false;

    this.roomInfoText = new TextBlock("roomInfo", "Room: n/a (n/a)");
    this.roomInfoText.fontSize = fontSize;
    this.roomInfoText.fontFamily = fontFamily;
    this.roomInfoText.height = fontHeight;
    this.roomInfoText.width = "100%";
    this.roomInfoText.color = "white";
    this.roomInfoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.roomInfoText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.roomInfoText.isVisible = true;
    this.debugInfoPanel.addControl(this.roomInfoText);

    this.playerCountText = new TextBlock("playerCount", "Players: 0");
    this.playerCountText.fontSize = fontSize;
    this.playerCountText.fontFamily = fontFamily;
    this.playerCountText.height = fontHeight;
    this.playerCountText.width = "100%";
    this.playerCountText.color = "white";
    this.playerCountText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.playerCountText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.debugInfoPanel.addControl(this.playerCountText);

    this.latencyText = new TextBlock("latency", "Latency: 0ms");
    this.latencyText.fontSize = fontSize;
    this.latencyText.fontFamily = fontFamily;
    this.latencyText.height = fontHeight;
    this.latencyText.width = "100%";
    this.latencyText.color = "white";
    this.latencyText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.latencyText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.debugInfoPanel.addControl(this.latencyText);

    debugGroup.addControl(this.debugInfoPanel);
  }

  public updateDebugInfo() {
    const roomName = this.connection.getRoomName();
    const roomId = this.connection.getRoomId();
    this.roomInfoText.text = `Room: ${roomName} (${roomId})`;
    this.playerCountText.text = `Players: ${this.connection.getPlayerCount()}`;
    this.latencyText.text = `Latency: ${this.connection.getLastLatency()}ms`;
  }
}
