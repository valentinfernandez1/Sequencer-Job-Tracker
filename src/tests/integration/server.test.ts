import { register } from "prom-client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { AlertManager } from "../../alerts/AlertManager.js";
import { config } from "../../config.js";
import { EthProvider } from "../../eth/EthProvider.js";
import { MetricsManager } from "../../metrics/MetricsManager.js";
import { startInfraServices } from "../../server.js";

describe("server (forked)", () => {
    const blockNumber = 24228415;
    beforeEach(() => {
        //@ts-ignore
        EthProvider.instance = null;
        register.clear();
    });
    it("Fails to start on invalid RPC node", async () => {
        const correctRpc = config.eth.rpc;
        config.eth.rpc = "InvalidRPC.com";
        await expect(EthProvider.getInstance()).rejects.toThrow();

        //@ts-ignore
        EthProvider.instance = null;

        config.eth.rpc = correctRpc;
    });

    it("Connects to RPC correctly", async () => {
        const provider = (await EthProvider.getInstance()).getProvider();

        expect(await provider.getBlockNumber()).toStrictEqual(blockNumber);
    });

    it("Starts infra services correctly", () => {
        startInfraServices();

        //@ts-ignore
        expect(MetricsManager.instance).toBeDefined();
        //@ts-ignore
        expect(AlertManager.instance).toBeDefined();
    });
    afterAll(async () => {
        // Make sure that the state doesn't bleed out to other tests
        //@ts-ignore
        EthProvider.instance = null;
        //@ts-ignore
        MetricsManager.instance = null;
        register.clear();
        //@ts-ignore
        AlertManager.instance = null;
    });
});
