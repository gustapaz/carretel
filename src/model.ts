export type Cell = { lane: number; sector: number };
export type Weave = 0 | 1 | 2;
export type Mode = "treino" | "cadencia" | "giro";
export type State = {
  body: Cell[];
  knots: Cell[];
  food: Cell;
  seed: number;
  ticks: number;
  collected: number;
  status: "playing" | "won" | "lost";
  reason: string;
  weave: Weave;
};
export const patterns = [
  {
    name: "Ponto aberto",
    seed: 731,
    knots: [
      { lane: 0, sector: 3 },
      { lane: 2, sector: 8 },
    ],
  },
  {
    name: "Entrelaço",
    seed: 1927,
    knots: [
      { lane: 0, sector: 2 },
      { lane: 1, sector: 5 },
      { lane: 2, sector: 9 },
    ],
  },
  {
    name: "Avesso",
    seed: 5081,
    knots: [
      { lane: 2, sector: 2 },
      { lane: 0, sector: 5 },
      { lane: 1, sector: 8 },
      { lane: 2, sector: 11 },
    ],
  },
];
export const modes: Record<Mode, { label: string; period: number }> = {
  treino: { label: "Treino", period: 0 },
  cadencia: { label: "Cadência", period: 0.65 },
  giro: { label: "Giro", period: 0.4 },
};
export const same = (a: Cell, b: Cell) =>
  a.lane === b.lane && a.sector === b.sector;
function spawn(body: Cell[], knots: Cell[], seed: number) {
  const free: Cell[] = [];
  for (let lane = 0; lane < 3; lane++)
    for (let sector = 0; sector < 12; sector++) {
      const c = { lane, sector };
      if (![...body, ...knots].some((b) => same(b, c))) free.push(c);
    }
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { food: free[next % free.length], seed: next };
}
export function create(weave: Weave): State {
  const p = patterns[weave],
    body = [0, 11, 10, 9].map((sector) => ({ lane: 1, sector }));
  return {
    body,
    knots: p.knots.map((c) => ({ ...c })),
    ...spawn(body, p.knots, p.seed),
    ticks: 0,
    collected: 0,
    status: "playing",
    reason: "",
    weave,
  };
}
export function step(s: State, change: number): State {
  if (s.status !== "playing" || ![-1, 0, 1].includes(change)) return s;
  const head = {
      lane: Math.max(0, Math.min(2, s.body[0].lane + change)),
      sector: (s.body[0].sector + 1) % 12,
    },
    eat = same(head, s.food),
    occupied = eat ? s.body : s.body.slice(0, -1),
    ticks = s.ticks + 1;
  if (s.knots.some((c) => same(c, head)))
    return { ...s, ticks, status: "lost", reason: "A fita encontrou um nó." };
  if (occupied.some((c) => same(c, head)))
    return {
      ...s,
      ticks,
      status: "lost",
      reason: "A fita cruzou a própria cauda.",
    };
  const body = [head, ...s.body];
  if (!eat) body.pop();
  const collected = s.collected + (eat ? 1 : 0);
  let next = { ...s, body, ticks, collected };
  if (collected === 8)
    return {
      ...next,
      status: "won",
      reason: "Oito carretéis. O fio encontrou seu caminho.",
    };
  if (ticks >= 180)
    return {
      ...next,
      status: "lost",
      reason: "O fio acabou depois de 180 pulsos.",
    };
  if (eat) next = { ...next, ...spawn(body, s.knots, s.seed) };
  return next;
}
export const score = (s: State) =>
  s.collected * 100 + (s.status === "won" ? Math.max(0, 200 - s.ticks) * 2 : 0);
export type RecordEntry = { played: number; wins: number; best: number };
export type Save = {
  version: 1;
  sound: boolean;
  motion: boolean;
  records: RecordEntry[];
};
export const blank = (): Save => ({
  version: 1,
  sound: false,
  motion: false,
  records: Array.from({ length: 9 }, () => ({ played: 0, wins: 0, best: 0 })),
});
export function readSave(raw: string | null): Save {
  try {
    const s = JSON.parse(raw || "null");
    if (
      s?.version !== 1 ||
      typeof s.sound !== "boolean" ||
      typeof s.motion !== "boolean" ||
      !Array.isArray(s.records) ||
      s.records.length !== 9 ||
      s.records.some(
        (r: RecordEntry) =>
          !r ||
          ![r.played, r.wins, r.best].every(
            (n) => Number.isInteger(n) && n >= 0 && n <= 1000000,
          ) ||
          r.wins > r.played,
      )
    )
      return blank();
    return {
      version: 1,
      sound: s.sound,
      motion: s.motion,
      records: s.records.map((r: RecordEntry) => ({
        played: r.played,
        wins: r.wins,
        best: r.best,
      })),
    };
  } catch {
    return blank();
  }
}
export function record(save: Save, s: State, mode: Mode): Save {
  if (s.status === "playing") return save;
  const i = s.weave * 3 + ["treino", "cadencia", "giro"].indexOf(mode),
    old = save.records[i];
  if (old.played >= 1000000) return save;
  const records = save.records.map((r) => ({ ...r }));
  records[i] = {
    played: old.played + 1,
    wins: old.wins + (s.status === "won" ? 1 : 0),
    best: Math.max(old.best, score(s)),
  };
  return { ...save, records };
}
export class Clock {
  acc = 0;
  reset() {
    this.acc = 0;
  }
  advance(dt: number, period: number, tick: () => boolean) {
    if (!Number.isFinite(dt) || dt < 0 || period <= 0) return;
    this.acc += Math.min(0.25, dt);
    let n = 0;
    while (this.acc >= period && n++ < 2) {
      this.acc -= period;
      if (!tick()) {
        this.reset();
        return;
      }
    }
    if (n > 2) this.acc = 0;
  }
}
