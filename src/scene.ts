import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HemisphericLight,
  PointerEventTypes,
  LinesMesh
} from "babylonjs";
import { ObstacleModel } from "./models/ObstacleModel";
import { PlayerModel } from "./models/PlayerModel";
import { ColorCube } from "./models/ColorCube";
import { GameUI, PlayerMode } from "./ui";
import { colyseusConnection } from "./connection";

export function createScene(canvas: HTMLCanvasElement): Scene {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);

  const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 6, 36, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  const light = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
  light.intensity = 0.95;

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 6000, height: 6000, subdivisions: 2 },
    scene
  );
  const groundMaterial = new StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = Color3.White();
  groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
  ground.material = groundMaterial;
  const gridExtent = 2500;
  const gridSquareSize = 1;
  const gridSquareOffset = gridSquareSize / 2;
  const gridLines: Vector3[][] = [];
  for (let i = -gridExtent; i <= gridExtent; i += gridSquareSize) {
    gridLines.push([
      new Vector3(i + gridSquareOffset, 0.01, -gridExtent + gridSquareOffset),
      new Vector3(i + gridSquareOffset, 0.01, gridExtent + gridSquareOffset)
    ]);
  }
  for (let i = -gridExtent; i <= gridExtent; i += gridSquareSize) {
    gridLines.push([
      new Vector3(-gridExtent + gridSquareOffset, 0.01, i + gridSquareOffset),
      new Vector3(gridExtent + gridSquareOffset, 0.01, i + gridSquareOffset)
    ]);
  }
  const gridOverlay = MeshBuilder.CreateLineSystem(
    "gridOverlay",
    { lines: gridLines, updatable: false },
    scene
  ) as LinesMesh;
  gridOverlay.color = new Color3(0.75, 0.75, 0.75);
  gridOverlay.isPickable = false;
  gridOverlay.renderingGroupId = 0;

  const obstacles: ObstacleModel[] = [];
  obstacles.push(new ObstacleModel(scene, new Vector3(3, 0, 3)));
  obstacles.push(new ObstacleModel(scene, new Vector3(-4, 0, -1)));

  const player = new PlayerModel(scene, obstacles);
  camera.setTarget(player.mesh.position);
  const cameraOffset = camera.position.subtract(player.mesh.position);
  const ui = new GameUI(scene, colyseusConnection);
  ui.attachPlayerMesh(player.mesh);
  const placedCubes = new Map<string, ColorCube>();
  let pendingPlacement: { position: Vector3; color: Color3 } | null = null;
  const gridKey = (position: Vector3) => `${position.x},${position.z}`;

  const positionMatches = (posA: Vector3, posB: Vector3, tolerance = 0.05) =>
    Math.abs(posA.x - posB.x) < tolerance && Math.abs(posA.z - posB.z) < tolerance;

  player.setDestinationCallback((position) => {
    if (!pendingPlacement) {
      return;
    }
    if (!positionMatches(position, pendingPlacement.position)) {
      return;
    }
    const key = gridKey(pendingPlacement.position);
    const existing = placedCubes.get(key);
    if (existing) {
      existing.mesh.dispose();
    }
    const cube = new ColorCube(scene, pendingPlacement.position, pendingPlacement.color);
    placedCubes.set(key, cube);
    pendingPlacement = null;
  });
  let currentMode: PlayerMode = ui.getMode();
  ui.onModeChange = (mode) => {
    currentMode = mode;
  };

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
      const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === ground);
      if (pick && pick.hit && pick.pickedPoint) {
        const snapped = new Vector3(
          Math.round(pick.pickedPoint.x),
          0,
          Math.round(pick.pickedPoint.z)
        );
        if (currentMode === "move") {
          player.setTarget(snapped);
        } else {
          const selectedColor = ui.getSelectedColor();
          pendingPlacement = { position: snapped, color: selectedColor };
          player.setTarget(snapped);
        }
      }
    }
  });

  engine.runRenderLoop(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    camera.setTarget(player.mesh.position);
    player.update(deltaSeconds);
    ui.updateDebugInfo();
    camera.position = player.mesh.position.add(cameraOffset);
    scene.render();
  });

  window.addEventListener("resize", () => engine.resize());

  colyseusConnection.connect();
  return scene;
}
