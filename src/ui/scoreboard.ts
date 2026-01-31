import {
  AdvancedDynamicTexture,
  Control,
  ScrollViewer,
  StackPanel,
  TextBlock,
  Rectangle
} from "babylonjs-gui";

export type ScoreboardEntry = { name: string; score: number };

export class ScoreboardPanel {
  private readonly container: Rectangle;
  private readonly entriesPanel: StackPanel;
  private readonly title: TextBlock;

  constructor(gui: AdvancedDynamicTexture) {
    this.container = new Rectangle();
    this.container.width = "260px";
    this.container.height = "320px";
    this.container.cornerRadius = 12;
    this.container.background = "rgba(0, 0, 0, 0.75)";
    this.container.thickness = 0;
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.container.paddingLeft = "10px";
    this.container.paddingRight = "10px";
    this.container.paddingTop = "8px";
    this.container.paddingBottom = "8px";
    this.container.isPointerBlocker = false;

    this.title = new TextBlock("scoreboardTitle", "Scoreboard");
    this.title.fontSize = 18;
    this.title.fontFamily = "Consolas";
    this.title.color = "white";
    this.title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.title.height = "30px";
    this.container.addControl(this.title);

    const scroll = new ScrollViewer();
    scroll.width = "100%";
    scroll.height = "260px";
    scroll.barColor = "rgba(255, 255, 255, 0.4)";
    scroll.thickness = 8;
    scroll.background = "transparent";
    scroll.isPointerBlocker = false;
    scroll.thickness = 0;
    this.entriesPanel = new StackPanel();
    this.entriesPanel.isVertical = true;
    this.entriesPanel.width = "100%";
    scroll.addControl(this.entriesPanel);
    this.container.addControl(scroll);

    gui.addControl(this.container);
    this.setVisible(false);
  }

  update(entries: ScoreboardEntry[]) {
    this.entriesPanel.children?.forEach((child) => child.dispose());
    entries.forEach((entry) => {
      const row = new TextBlock(
        `scoreboard-row-${entry.name}`,
        `${entry.name} — ${entry.score}`
      );
      row.fontSize = 16;
      row.fontFamily = "Consolas";
      row.color = "white";
      row.height = "22px";
      row.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      row.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      this.entriesPanel.addControl(row);
    });
  }

  setVisible(value: boolean) {
    this.container.isVisible = value;
  }
}
