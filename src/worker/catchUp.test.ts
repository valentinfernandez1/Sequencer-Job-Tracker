// Only unit test for handleFoundJob() and estimateCatchUpTime() as the rest
// of the functions are very RPC heavy and mocking would not necessarily be the

import { describe, expect, it, vi } from "vitest";

import { estimateCatchUpTime } from "./catchUp.js";

vi.mock("../config.js", () => ({
    config: {},
}));

// Only unit test for estimateCatchUpTime() as the rest of the functions are
// very RPC heavy and mocking would not necessarily be the best approach
// intead they are part of the integration tests on `tests/integration/eth`
describe("catchUp", () => {
    it("estimateCatchUpTime returns infinity when no blocks have been processed", () => {
        expect(estimateCatchUpTime(100, 200, Date.now(), 100)).toBe(Infinity);
    });

    it("Estimated catchUp time correctly", () => {
        const startTime = 1_000_000;
        const nowTime = startTime + 10_000;

        vi.spyOn(Date, "now").mockReturnValue(nowTime);

        const eta = estimateCatchUpTime(110, 200, startTime, 100);
        expect(eta).toStrictEqual(90);
    });
});
