import { JsonRpcProvider } from "ethers";
import { beforeAll, describe, expect, it } from "vitest";

import { EthProvider } from "../../eth/EthProvider.js";
import { findActiveJobs, findJobInBlock } from "../../worker/jobs.js";

describe("jobs (forked)", () => {
    let provider: JsonRpcProvider;
    const blockNumber = 24228415;
    beforeAll(async () => {
        provider = (await EthProvider.getInstance()).getProvider();
    });

    it("Finds correct amount of active jobs", async () => {
        const activeJobs = await findActiveJobs(provider, blockNumber);
        expect(activeJobs.size).toStrictEqual(9);
    });

    it("Finds job in block with worked job", async () => {
        const block = await provider.getBlock(blockNumber, true);
        const workedJob = await findJobInBlock(provider, block!);

        expect(workedJob).toStrictEqual({
            address: "0x67ad4000e73579b9725ee3a149f85c4af0a61361",
            blockNumber: 24228415,
            network: "0x4d414b4552000000000000000000000000000000000000000000000000000000",
        });
    });

    it("Returns null on a block with no worked jobs", async () => {
        const block = await provider.getBlock(blockNumber - 1, true);
        const workedJob = await findJobInBlock(provider, block!);

        expect(workedJob).toBeNull();
    });
});
