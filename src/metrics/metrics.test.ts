import http from "http";
import client from "prom-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MetricsManager } from "./MetricsManager.js";

vi.mock("../config.js", () => ({
    config: {
        metrics: {
            port: 9101,
        },
    },
}));

describe("MetricsManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        client.register.clear();
        // @ts-expect-error test reset
        MetricsManager.instance = null;
    });

    it("returns the same instance (Singleton)", () => {
        const a = MetricsManager.getInstance();
        const b = MetricsManager.getInstance();

        expect(a).toBe(b);
    });

    it("Initializes metrics properly", async () => {
        const metrics = await MetricsManager.getInstance().register.metrics();

        expect(metrics).toContain("keeper_jobs_worked_total");
        expect(metrics).toContain("keeper_current_block");
        expect(metrics).toContain("keeper_blocks_processed_total");
    });

    it("exposes /metrics endpoint", async () => {
        const { MetricsManager } = await import("./MetricsManager.js");
        const manager = MetricsManager.getInstance();

        manager.startServer();

        const res = await fetch("http://localhost:9101/metrics");

        expect(res.status).toBe(200);
        expect(await res.text()).toContain("keeper_jobs_worked_total");
    });
});
