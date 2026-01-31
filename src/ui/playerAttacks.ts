import { AdvancedDynamicTexture, Button, Control, StackPanel } from "babylonjs-gui";

export class PlayerAttacks {
  private readonly container: StackPanel;
  private readonly quickAttackButton: Button;
  private readonly specialButton: Button;
  private readonly quickAttackEnabledColor = "rgba(173, 216, 230, 1)";
  private readonly quickAttackDisabledColor = "rgba(140, 140, 140, 0.8)";
  private readonly specialEnabledColor = "rgba(173, 216, 230, 1)";
  private readonly specialDisabledColor = "rgba(140, 140, 140, 0.8)";
  private quickAttackReady = true;
  private specialReady = true;
  public onQuickAttack: () => void = () => {};
  public onSpecial: () => void = () => {};

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

    this.quickAttackButton = this.createButton(
      "Quick attack",
      () => this.onQuickAttack(),
      () => this.quickAttackReady
    );
    this.specialButton = this.createButton(
      "Special",
      () => this.onSpecial(),
      () => this.specialReady
    );

    this.container.addControl(this.quickAttackButton);
    this.container.addControl(this.specialButton);
  }

  setQuickAttackEnabled(enabled: boolean) {
    this.quickAttackReady = enabled;
    this.quickAttackButton.background = enabled
      ? this.quickAttackEnabledColor
      : this.quickAttackDisabledColor;
  }

  setSpecialEnabled(enabled: boolean) {
    this.specialReady = enabled;
    this.specialButton.background = enabled ? this.specialEnabledColor : this.specialDisabledColor;
  }

  private createButton(text: string, handler: () => void, canActivate?: () => boolean) {
    const button = Button.CreateSimpleButton(`${text.replace(/\s+/g, "")}Btn`, text);
    button.height = "40px";
    button.fontSize = 16;
    button.cornerRadius = 20;
    button.thickness = 0;
    button.background = "rgba(173, 216, 230, 1)";
    button.color = "white";
    button.hoverCursor = "pointer";
    button.isPointerBlocker = true;
    button.onPointerUpObservable.add(() => {
      if (canActivate && !canActivate()) {
        return;
      }
      handler();
    });
    return button;
  }
}
