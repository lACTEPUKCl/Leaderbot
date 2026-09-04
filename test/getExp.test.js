import test from "node:test";
import assert from "node:assert/strict";

import getExp from "../utility/getExp.js";

const resetStats = {
  exp: 57364,
  kills: 15,
  death: 9,
  revives: 12,
  teamkills: 0,
  squad: { timeplayed: 22680, leader: 3, cmd: 2 },
  matches: { won: 3, lose: 1 },
};

test("uses stored cumulative EXP after a statistics reset", () => {
  const result = getExp(resetStats);
  assert.equal(result.rankStr, "Старший сержант");
  assert.equal(result.expProgress, "57364 / 70000");
});

test("falls back to calculated EXP for legacy records without exp", () => {
  const { exp, ...legacyStats } = resetStats;
  const result = getExp(legacyStats);
  assert.equal(result.rankStr, "Сержант");
  assert.equal(result.expProgress, "22764 / 40000");
});
