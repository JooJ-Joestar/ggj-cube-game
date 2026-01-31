import { AdvancedDynamicTexture, Button, Control, StackPanel } from "babylonjs-gui";

export class PlayerAttacks {
  private readonly container: StackPanel;
  private readonly quickAttackButton: Button;
  private readonly specialButton: Button;

  constructor(gui: AdvancedDynamicTexture) {
    this.container = new StackPanel();
    this.container.width = "180px";
    this.container.isVertical = true;
    this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.container.paddingRight = "16px";
    this.container.paddingBottom = "16px";
    this.container.spacing = 8;
    this.container.isPointerBlocker = false;
    gui.addControl(this.container);

    this.quickAttackButton = this.createButton("Quick attack");
    this.specialButton = this.createButton("Special");

    this.container.addControl(this.quickAttackButton);
    this.container.addControl(this.specialButton);
  }

  private createButton(text: string) {
    const button = Button.CreateSimpleButton(`${text.replace(/\s+/g, "")}Btn`, text);
    button.height = "40px";
    button.fontSize = 16;
    button.cornerRadius = 20;
    button.thickness = 0;
    button.background = "rgba(173, 216, 230, 0.4)";
    button.color = "white";
    button.hoverCursor = "pointer";
    button.isPointerBlocker = true;
    return button;
  }
}
