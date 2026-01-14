import { beforeEach, describe, expect, it, vi } from "vitest";

import { AlertThirdPartyStatus } from "../../../alerts/AlertManager.js";
import { WorkedJob } from "../../../worker/jobs.js";

vi.mock("../../../config.js", () => ({
    config: {
        alerts: {
            discordWH: "https://discord.com/api/webhooks/test",
            slackWH: "https://hooks.slack.com/services/test",
        },
    },
}));

global.fetch = vi.fn();

const workedJob: WorkedJob = {
    address: "0x123",
    blockNumber: 123456,
    network: "1",
};

describe("AlertManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("returns the same instance (Singleton)", async () => {
        const { AlertManager } = await import("../../../alerts/AlertManager.js");
        const a = AlertManager.getInstance();

        expect(a).toBe(AlertManager.getInstance());
    });

    it("sends Discord and slack alerts", async () => {
        const { AlertManager } = await import("../../../alerts/AlertManager.js");
        const expectedResponse: AlertThirdPartyStatus = { discord: true, slack: true };

        const manager = AlertManager.getInstance();
        const resp: AlertThirdPartyStatus = manager.emitAlerts(workedJob);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(resp).toStrictEqual(expectedResponse);

        expect(fetch).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("discord.com"),
            expect.objectContaining({
                method: "POST",
            }),
        );

        expect(fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("slack.com"),
            expect.objectContaining({
                method: "POST",
            }),
        );
    });

    it("disables alerts when hook url is not provided", async () => {
        vi.doMock("../../../config.js", () => ({
            config: {
                alerts: {
                    discordWH: null,
                    slackWH: null,
                },
            },
        }));

        const { AlertManager } = await import("../../../alerts/AlertManager.js");
        const expectedResponse: AlertThirdPartyStatus = { discord: false, slack: false };

        const manager = AlertManager.getInstance();
        const resp: AlertThirdPartyStatus = manager.emitAlerts(workedJob);

        expect(resp).toStrictEqual(expectedResponse);
        expect(fetch).toHaveBeenCalledTimes(0);
    });

    it("It errors on incorrect discord webhook url provided", async () => {
        vi.doMock("../../../config.js", () => ({
            config: {
                alerts: {
                    discordWH: "NotWhURL.com",
                    slackWH: "https://hooks.slack.com/services/test",
                },
            },
        }));

        const { AlertManager } = await import("../../../alerts/AlertManager.js");
        expect(() => AlertManager.getInstance()).toThrowError(
            "Invalid Discord Web Hook URL Provided",
        );
    });

    it("It errors on incorrect slack webhook url provided", async () => {
        vi.doMock("../../../config.js", () => ({
            config: {
                alerts: {
                    discordWH: "https://discord.com/api/webhooks/test",
                    slackWH: "NotWhURL.com",
                },
            },
        }));

        const { AlertManager } = await import("../../../alerts/AlertManager.js");
        expect(() => AlertManager.getInstance()).toThrowError(
            "Invalid Slack Web Hook URL Provided",
        );
    });
});
