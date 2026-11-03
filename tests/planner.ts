import { step, same, type State } from "../src/model.ts";
export function pathToFood(start: State): number[] | null {
  const dist = (start.food.sector - start.body[0].sector + 12) % 12 || 12;
  let visits = 0;
  function search(s: State, left: number): number[] | null {
    if (++visits > 150000) return null;
    if (s.collected > start.collected || s.status === "won") return [];
    if (
      !left ||
      s.status !== "playing" ||
      Math.abs(s.food.lane - s.body[0].lane) > left
    )
      return null;
    const toward = Math.sign(s.food.lane - s.body[0].lane);
    const options = [...new Set([toward, 0, -1, 1])];
    for (const d of options) {
      const n = step(s, d);
      if (n.status === "lost") continue;
      const tail = search(n, left - 1);
      if (tail) return [d, ...tail];
    }
    return null;
  }
  for (const depth of [dist, dist + 12, dist + 24]) {
    const result = search(start, depth);
    if (result) return result;
  }
  return null;
}
export function winningPath(start: State) {
  let s = start;
  const path: number[] = [];
  while (s.status === "playing" && path.length < 180) {
    const p = pathToFood(s);
    if (!p) throw Error("No route");
    for (const d of p) {
      s = step(s, d);
      path.push(d);
    }
  }
  if (s.status !== "won") throw Error("Not won");
  return path;
}
