import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isValidCheckUrl, X_CHECK_END, X_CHECK_START, xCheckCases, xCheckTable } from "./x-check";

const DOC = path.resolve(import.meta.dirname, "../../docs/x-check.md");

describe("x-check", () => {
  it("builds X search urls within the length limit", () => {
    for (const c of xCheckCases()) expect(isValidCheckUrl(c.url), c.id).toBe(true);
  });

  // `npm run x-check`（--mode write）で docs/x-check.md の表を作り直す。ふだんのテストでは、表が今の組み立てと同じかだけを見る
  it("keeps docs/x-check.md in sync with the query builder", () => {
    const doc = readFileSync(DOC, "utf8");
    const start = doc.indexOf(X_CHECK_START);
    const end = doc.indexOf(X_CHECK_END) + X_CHECK_END.length;
    const current = doc.slice(start, end);
    if (import.meta.env.MODE === "write") {
      writeFileSync(DOC, doc.slice(0, start) + xCheckTable() + doc.slice(end));
      return;
    }
    expect(current, "npm run x-check で docs/x-check.md を作り直す").toBe(xCheckTable());
  });
});
