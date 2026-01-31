import { Scene } from "babylonjs";
import { AdvancedDynamicTexture } from "babylonjs-gui";
import { PlayerLabel } from "../models/PlayerLabel";
import { ColyseusConnection } from "../connection";
import { PlayerControls, PlayerMode } from "./playerControls";
import { DebugPanel } from "./debugPanel";
import { MatchTimer } from "./timer";
import { MatchStatusCode } from "../connection";
import { ScoreboardPanel } from "./scoreboard";
import { PlayerAttacks } from "./playerAttacks";

export class GameUI {
  private gui: AdvancedDynamicTexture;
  private controls: PlayerControls;
  private debugPanel: DebugPanel;
  private label: PlayerLabel;
  private timer: MatchTimer;
  private scoreboard: ScoreboardPanel;
  private attacks: PlayerAttacks;
  public onModeChange: (mode: PlayerMode) => void = () => {};

  constructor(scene: Scene, connection: ColyseusConnection) {
    this.gui = AdvancedDynamicTexture.CreateFullscreenUI("game-ui", true, scene as any);
    this.gui.idealHeight = 720;

    this.controls = new PlayerControls(this.gui);
    this.controls.onModeChange = (mode) => {
      this.onModeChange(mode);
    };

    this.label = new PlayerLabel(this.gui);
    connection.onPlayerNameAssigned((name) => {
      this.label.setName(name);
    });

    this.timer = new MatchTimer(this.gui);
    connection.onMatchTimeChange((seconds) => this.timer.update(seconds));
    this.scoreboard = new ScoreboardPanel(this.gui);
    this.scoreboard.setVisible(false);
    this.controls.onScoreboardToggle = (visible) => this.scoreboard.setVisible(visible);
    connection.onMatchStatusChange((status) => {
      const prefix = status === MatchStatusCode.Play ? "Time left" : "Next match";
      this.timer.setLabelPrefix(prefix);
      if (status === MatchStatusCode.Pause) {
        this.scoreboard.setVisible(true);
      } else {
        this.scoreboard.setVisible(false);
      }
    });
    connection.onScoreboardUpdate((entries) => {
      this.scoreboard.update(
        entries.map((entry) => ({ name: entry.name, score: entry.score }))
      );
    });

    this.debugPanel = new DebugPanel(this.gui);
    this.updateDebugInfo(connection);

    this.attacks = new PlayerAttacks(this.gui);
  }

  getMode() {
    return this.controls.getMode();
  }

  getSelectedColor() {
    return this.controls.getSelectedColor();
  }

  updateDebugInfo(connection: ColyseusConnection) {
    this.debugPanel.update(connection);
  }

  attachPlayerMesh(mesh: any) {
    this.label.attachToMesh(mesh);
  }
}

export type { PlayerMode } from "./playerControls";
