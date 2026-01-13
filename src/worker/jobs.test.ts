import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleFoundJob } from "./jobs.js";

const emitAlerts = vi.fn();
const inc = vi.fn();

vi.mock("../config.js", () => ({
    config: {
        alerts: {},
        metrics: { port: 9100 },
    },
}));

vi.mock("../alerts/AlertManager.js", () => ({
    AlertManager: {
        getInstance: () => ({
            emitAlerts,
        }),
    },
}));

vi.mock("../metrics/MetricsManager.js", () => ({
    MetricsManager: {
        getInstance: () => ({
            jobsWorkedCounter: { inc },
        }),
    },
}));

// Only unit test for handleFoundJob() as the rest of the functions are
// very RPC heavy and mocking would not necessarily be the best approach
// intead they are part of the integration tests on `tests/integration/eth`
describe("jobs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it("handleFoundJob() fires alerts and metrics", async () => {
        await handleFoundJob({
            address: "0x67ad4000e73579b9725ee3a149f85c4af0a61361",
            blockNumber: 100,
            network: "0x47454c41544f0000000000000000000000000000000000000000000000000000",
        });

        expect(emitAlerts).toHaveBeenCalledOnce();
        expect(inc).toHaveBeenCalledOnce();
    });
});
