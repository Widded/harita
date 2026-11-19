import { describe, expect, it } from "vitest";
import { buildRows } from "./points";
import { toGrid } from "./xlsx";

describe("toGrid", () => {
  it("durulan noktayı BAK. NOK sütununa tekrar yazmaz", () => {
    const { rows, totalY, totalX } = buildRows([
      { no: "P.4779", y: 404765.83, x: 4545906.26 },
      { no: "1", y: 404661.38, x: 4545929.42 },
    ]);
    const grid = toGrid(rows, totalY, totalX);
    expect(grid[1][0]).toBe("P.4779"); // DUR. NOK
    expect(grid[1][1]).toBe(""); // BAK. NOK
    expect(grid[2][1]).toBe("1"); // diğer satırlar bakılan
  });
});
