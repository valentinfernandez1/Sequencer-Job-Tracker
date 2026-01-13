import { Block, JsonRpcProvider } from "ethers";

import { config } from "../config.js";
import { MetricsMannager } from "../metrics/MetricsMannager.js";
import { findJobInBlock, handleFoundJob } from "./jobs.js";

const metrics = MetricsMannager.getInstance();

export async function catchUp(provider: JsonRpcProvider): Promise<number> {
    let latestBlock = await provider.getBlockNumber();
    let currentBlock = latestBlock - config.eth.catchUpDepth;

    const startTime = Date.now();
    const startBlock = currentBlock;

    const { batchPullAmount, rateLimitingDelay } = config.eth;
    while (currentBlock < latestBlock) {
        const amountBlocks =
            latestBlock - currentBlock > batchPullAmount
                ? batchPullAmount
                : latestBlock - currentBlock;

        const eta = estimateCatchUpTime(currentBlock, latestBlock, startTime, startBlock);

        console.log(
            `Catching Up (${currentBlock}/${latestBlock}) - Pulling ${amountBlocks} Blocks - ETA: ${eta} secs`,
        );

        const blocks = await bulkPullBlocks(provider, currentBlock, amountBlocks);

        console.log(
            `Blocks (${currentBlock}/${
                currentBlock + amountBlocks
            }) Received - Inspecting for Job transactions`,
        );

        // Delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, rateLimitingDelay));

        await bulkInspectBlock(provider, blocks);

        // Delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, rateLimitingDelay));

        currentBlock += amountBlocks;

        metrics.currentBlockGauge.set(currentBlock);

        // When it arrives at the last iteration, it must
        // update the latestBlock number to ensure the HEAD
        // that it is aiming to catch up to is the correct one.
        if (currentBlock == latestBlock) {
            latestBlock = await provider.getBlockNumber();
        }
    }
    return latestBlock;
}

async function bulkPullBlocks(
    provider: JsonRpcProvider,
    fromBlock: number,
    amountBlocks: number,
): Promise<(Block | null)[]> {
    // Query blocks in parallel for better performance
    const toBlock = fromBlock + amountBlocks;
    const blockPromises = [];
    for (let i = fromBlock; i <= toBlock; i++) {
        blockPromises.push(provider.getBlock(i, true));
    }

    return await Promise.all(blockPromises);
}

async function bulkInspectBlock(provider: JsonRpcProvider, blocks: (Block | null)[]) {
    const inspectPromises = [];

    for (const block of blocks) {
        if (!block) return;
        inspectPromises.push(
            findJobInBlock(provider, block).then((maybeJob) => {
                metrics.blocksProcessedCounter.inc();

                return maybeJob ? handleFoundJob(maybeJob) : null;
            }),
        );
    }

    await Promise.all(inspectPromises);
    return;
}

function estimateCatchUpTime(
    currentBlock: number,
    toBlock: number,
    startTime: number,
    startBlock: number,
): number {
    const now = Date.now();

    const elapsedMs = now - startTime;
    const processedBlocks = currentBlock - startBlock;
    const remainingBlocks = toBlock - currentBlock;

    if (processedBlocks <= 0) return Infinity;

    const msPerBlock = elapsedMs / processedBlocks;
    const remainingMs = remainingBlocks * msPerBlock;

    return Math.ceil(remainingMs / 1000); // seconds
}
