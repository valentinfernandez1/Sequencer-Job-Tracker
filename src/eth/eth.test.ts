import { beforeEach, describe, expect, it, vi } from "vitest";

import { EthProvider } from "./EthProvider.js";

const sendMock = vi.fn();

vi.mock("ethers", async () => {
    const actual = await vi.importActual<typeof import("ethers")>("ethers");

    class MockJsonRpcProvider {
        send = sendMock;
    }

    return {
        ...actual,
        ethers: {
            ...actual.ethers,
            JsonRpcProvider: MockJsonRpcProvider,
        },
        JsonRpcProvider: MockJsonRpcProvider,
    };
});
describe("EthProvider", () => {
    beforeEach(() => {
        sendMock.mockReset();
    });

    it("returns the same instance (Singleton)", async () => {
        const e = await EthProvider.getInstance();

        expect(e).toBe(await EthProvider.getInstance());
        expect(e.getProvider()).toBeDefined();
    });
});
