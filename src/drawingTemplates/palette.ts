import { Color3 } from "babylonjs";

export enum PaletteColor {
  Black = 0,
  Yellow = 1,
  Orange = 2,
  Blue = 3,
  DarkTeal = 4,
  LightGray = 5
}

export const PALETTE_COLORS: Record<PaletteColor, Color3> = {
  [PaletteColor.Black]: new Color3(0, 0, 0),
  [PaletteColor.Yellow]: new Color3(1, 0.9, 0),
  [PaletteColor.Orange]: new Color3(1, 0.55, 0),
  [PaletteColor.Blue]: new Color3(0.1, 0.45, 1),
  [PaletteColor.DarkTeal]: new Color3(0, 0.4, 0.45),
  [PaletteColor.LightGray]: new Color3(1, 1, 1)
};

export const EMPTY_CELL = -1;

export const CHAR_TO_COLOR: Record<string, PaletteColor | typeof EMPTY_CELL> = {
  W: EMPTY_CELL,
  K: PaletteColor.Black,
  Y: PaletteColor.Yellow,
  O: PaletteColor.Orange,
  B: PaletteColor.Blue,
  T: PaletteColor.DarkTeal,
  G: PaletteColor.LightGray
};

export function colorToPaletteId(color: Color3) {
  let best: PaletteColor = PaletteColor.Black;
  let bestDistance = Number.POSITIVE_INFINITY;
  Object.entries(PALETTE_COLORS).forEach(([key, paletteColor]) => {
    const id = Number(key) as PaletteColor;
    const dr = color.r - paletteColor.r;
    const dg = color.g - paletteColor.g;
    const db = color.b - paletteColor.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDistance) {
      bestDistance = dist;
      best = id;
    }
  });
  return best;
}
