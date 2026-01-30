import { AdvancedDynamicTexture, StackPanel, Control, TextBlock } from "babylonjs-gui";
import { ColyseusConnection } from "../connection";

export class DebugPanel {
  private readonly panel: StackPanel;
  private roomInfo: TextBlock;
  private playerCount: TextBlock;
  private latency: TextBlock;
  private connectionLost: TextBlock;

  constructor(gui: AdvancedDynamicTexture) {
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
    gui.addControl(debugGroup);

    this.panel = new StackPanel();
    this.panel.isVertical = true;
    this.panel.width = panelSize;
    this.panel.adaptHeightToChildren = true;
    this.panel.adaptWidthToChildren = true;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.paddingTop = "4px";
    this.panel.spacing = 4;
    this.panel.paddingLeft = "8px";
    this.panel.paddingRight = "8px";
    this.panel.isPointerBlocker = false;

    this.roomInfo = new TextBlock("roomInfo", "Room: n/a (n/a)");
    this.roomInfo.fontSize = fontSize;
    this.roomInfo.fontFamily = fontFamily;
    this.roomInfo.height = fontHeight;
    this.roomInfo.width = "100%";
    this.roomInfo.color = "white";
    this.roomInfo.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.roomInfo.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.panel.addControl(this.roomInfo);

    this.playerCount = new TextBlock("playerCount", "Players: 0");
    this.playerCount.fontSize = fontSize;
    this.playerCount.fontFamily = fontFamily;
    this.playerCount.height = fontHeight;
    this.playerCount.width = "100%";
    this.playerCount.color = "white";
    this.playerCount.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.playerCount.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.panel.addControl(this.playerCount);

    this.latency = new TextBlock("latency", "Latency: 0ms");
    this.latency.fontSize = fontSize;
    this.latency.fontFamily = fontFamily;
    this.latency.height = fontHeight;
    this.latency.width = "100%";
    this.latency.color = "white";
    this.latency.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.latency.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.panel.addControl(this.latency);

    this.connectionLost = new TextBlock("connectionLost", "Connection lost");
    this.connectionLost.fontSize = fontSize;
    this.connectionLost.fontFamily = fontFamily;
    this.connectionLost.height = fontHeight;
    this.connectionLost.width = "100%";
    this.connectionLost.color = "red";
    this.connectionLost.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.connectionLost.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this.connectionLost.isVisible = false;
    this.panel.addControl(this.connectionLost);

    debugGroup.addControl(this.panel);
  }

  update(connection: ColyseusConnection) {
    const roomName = connection.getRoomName();
    const roomId = connection.getRoomId();
    this.roomInfo.text = `Room: ${roomName} (${roomId})`;
    this.playerCount.text = `Players: ${connection.getPlayerCount()}`;
    this.latency.text = `Latency: ${connection.getLastLatency()}ms`;
    this.connectionLost.isVisible = !connection.isConnected();
  }
}
