import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ponytail: harness check only; replace when real tests land
describe("test harness", () => {
  it("runs", () => {
    assert.equal(1 + 1, 2);
  });
});
