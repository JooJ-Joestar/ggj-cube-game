import { createScene } from "./scene";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
if (canvas) {
  createScene(canvas);
}
