import { createScene } from "./scene";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
if (!canvas) throw new Error("Canvas not found");
  createScene(canvas);