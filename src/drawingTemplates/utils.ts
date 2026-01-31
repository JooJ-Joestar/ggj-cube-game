import { CHAR_TO_COLOR } from "./palette";
import { DrawingTemplate } from "./types";

export function parseTemplate(name: string, rows: string[]): DrawingTemplate {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const cells = rows.map((row) =>
    row.split("").map((char) => {
      const mapped = CHAR_TO_COLOR[char];
      if (mapped === undefined) {
        throw new Error(`Unknown template char '${char}' in ${name}`);
      }
      return mapped;
    })
  );
  return { name, width, height, cells };
}
