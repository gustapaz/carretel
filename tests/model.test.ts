import { test } from "node:test";
import assert from "node:assert/strict";
import {
  create,
  step,
  same,
  score,
  Clock,
  blank,
  readSave,
  record,
  type Weave,
  type State,
} from "../src/model.ts";
import { winningPath } from "./planner.ts";
for (const weave of [0, 1, 2] as Weave[])
  test(`Pattern ${weave + 1}: complete deterministic round`, () => {
    let s = create(weave);
    const path = winningPath(s);
    for (const d of path) {
      s = step(s, d);
      assert.ok(
        s.body.every(
          (c) => c.lane >= 0 && c.lane < 3 && c.sector >= 0 && c.sector < 12,
        ),
      );
      assert.equal(
        new Set(s.body.map((c) => c.lane + "," + c.sector)).size,
        s.body.length,
      );
    }
    assert.equal(s.status, "won");
    assert.equal(s.collected, 8);
    assert.equal(s.body.length, 12);
    assert.ok(s.ticks < 180);
    assert.equal(step(s, 0), s);
    for (const mode of ["treino", "cadencia", "giro"] as const) {
      const r = record(blank(), s, mode);
      assert.equal(
        r.records[weave * 3 + ["treino", "cadencia", "giro"].indexOf(mode)]
          .wins,
        1,
      );
    }
    assert.deepEqual(winningPath(create(weave)), path);
  });
test("Growth, normal tail release and occupied tail collision", () => {
  let s = create(0);
  const next = { lane: 1, sector: 1 };
  s = { ...s, food: next };
  const grown = step(s, 0);
  assert.equal(grown.body.length, 5);
  assert.equal(grown.collected, 1);
  assert.ok(!grown.body.some((c) => same(c, grown.food)));
  const tail = {
    ...create(0),
    body: [
      { lane: 1, sector: 0 },
      { lane: 0, sector: 0 },
      { lane: 0, sector: 1 },
      { lane: 1, sector: 1 },
    ],
    food: { lane: 2, sector: 6 },
  };
  assert.equal(step(tail, 0).status, "playing");
  assert.equal(step({ ...tail, food: next }, 0).status, "lost");
});
test("Knots, body and 180-pulse limit end the round", () => {
  const s = create(0);
  assert.equal(
    step({ ...s, knots: [{ lane: 1, sector: 1 }] }, 0).status,
    "lost",
  );
  assert.equal(
    step(
      {
        ...s,
        body: [s.body[0], { lane: 1, sector: 1 }, { lane: 1, sector: 2 }],
      },
      0,
    ).status,
    "lost",
  );
  assert.equal(
    step({ ...s, ticks: 179, food: { lane: 2, sector: 9 } }, 0).reason,
    "O fio acabou depois de 180 pulsos.",
  );
  assert.equal(step(s, 2), s);
  assert.equal(s.ticks, 0);
});
test("Clock is bounded, repeatable and pause reset discards backlog", () => {
  const c = new Clock();
  let ticks = 0;
  for (let i = 0; i < 100; i++)
    c.advance(0.1, 0.4, () => {
      ticks++;
      return true;
    });
  assert.equal(ticks, 25);
  c.advance(999, 0.4, () => {
    ticks++;
    return true;
  });
  assert.ok(ticks <= 26);
  c.reset();
  c.advance(0.39, 0.4, () => {
    ticks++;
    return true;
  });
  assert.ok(c.acc <= 0.25);
  c.advance(0.2, 0.4, () => false);
  assert.equal(c.acc, 0);
});
test("Save validation, immutable record and score", () => {
  for (const raw of [
    null,
    "{}",
    "nope",
    JSON.stringify({ ...blank(), records: [{ played: -1, wins: 2, best: 0 }] }),
  ])
    assert.deepEqual(readSave(raw), blank());
  let s = create(0);
  for (const d of winningPath(s)) s = step(s, d);
  const b = blank(),
    r = record(b, s, "treino");
  assert.equal(b.records[0].played, 0);
  assert.equal(r.records[0].played, 1);
  assert.equal(r.records[0].best, score(s));
  assert.deepEqual(readSave(JSON.stringify(r)), r);
  assert.equal(record(b, create(0), "treino"), b);
});
