import { JsonRpcProvider } from "ethers";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { config } from "../../config.js";
import { EthProvider } from "../../eth/EthProvider.js";
import { bulkInspectBlock, bulkPullBlocks, catchUp } from "../../worker/catchUp.js";
import * as jobsModule from "../../worker/jobs.js";

describe("catchUp (forked)", () => {
    let provider: JsonRpcProvider;
    const endBlock = 24228415;

    beforeAll(async () => {
        provider = (await EthProvider.getInstance()).getProvider();
    });

    it("Processes blocks and finds jobs", async () => {
        const { latestBlock, amountFoundJobs } = await catchUp(provider);
        expect(latestBlock).toBe(endBlock);
        expect(amountFoundJobs).toBe(1);
    });

    it("Pull multiple blocks in parallel", async () => {
        const { batchPullAmount } = config.eth;

        const getBlockSpy = vi.spyOn(provider, "getBlock");

        const blocks = await bulkPullBlocks(provider, endBlock - batchPullAmount, batchPullAmount);

        expect(blocks.length).toBe(batchPullAmount);
        expect(blocks.every((b) => b !== undefined)).toBe(true);

        expect(getBlockSpy).toHaveBeenCalledTimes(batchPullAmount);
        getBlockSpy.mockRestore();
    });

    it("Inspects multiple blocks in search for jobs in parallel", async () => {
        const { batchPullAmount } = config.eth;
        const blocks = await bulkPullBlocks(
            provider,
            endBlock - batchPullAmount + 1,
            batchPullAmount,
        );

        const findJobInBlockSpy = vi.spyOn(jobsModule, "findJobInBlock");
        const handleFoundJobSpy = vi.spyOn(jobsModule, "handleFoundJob");

        const amountFoundJobs = await bulkInspectBlock(provider, blocks);

        expect(amountFoundJobs).toBe(1);
        expect(findJobInBlockSpy).toHaveBeenCalledTimes(batchPullAmount);
        expect(handleFoundJobSpy).toHaveBeenCalledTimes(amountFoundJobs);

        findJobInBlockSpy.mockRestore();
        handleFoundJobSpy.mockRestore();
    });
});
