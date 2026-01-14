import { Block, JsonRpcProvider } from "ethers";

import { config } from "../config.js";
import { MetricsManager } from "../metrics/MetricsManager.js";
import { findJobInBlock, handleFoundJob } from "./jobs.js";

const metrics = MetricsManager.getInstance();

/**
 * Processes historical blocks from configured depth to current block.
 * Fetches and inspects blocks in batches
 */
export async function catchUp(
    provider: JsonRpcProvider,
): Promise<{ latestBlock: number; amountFoundJobs: number }> {
    let latestBlock = await provider.getBlockNumber();
    let currentBlock = latestBlock - config.eth.catchUpDepth;
    let amountFoundJobs = 0;

    const startTime = Date.now();
    const startBlock = currentBlock;

    const { batchPullAmount, rateLimitingDelay } = config.eth;
    while (currentBlock <= latestBlock) {
        // Calculate batch size (either full batch or remaining blocks)
        const amountBlocks =
            latestBlock - currentBlock + 1 > batchPullAmount
                ? batchPullAmount
                : latestBlock - currentBlock + 1;

        const eta = estimateCatchUpTime(currentBlock, latestBlock, startTime, startBlock);

        console.log(
            `[ CATCH_UP ] Catching Up (${currentBlock}/${latestBlock}) - Pulling ${amountBlocks} Blocks - ETA: ${eta} secs`,
        );

        const blocks = await bulkPullBlocks(provider, currentBlock, amountBlocks);

        console.log(
            `[ CATCH_UP ] Retrieved Blocks (${currentBlock}/${
                currentBlock + amountBlocks - 1
            }) Received - Inspecting for Job transactions\n`,
        );

        // Delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, rateLimitingDelay));

        amountFoundJobs += await bulkInspectBlock(provider, blocks);

        currentBlock += amountBlocks;

        metrics.currentBlockGauge.set(currentBlock);

        // When it arrives at the last iteration, it must
        // update the latestBlock number to ensure the HEAD
        // that it is aiming to catch up to is the correct one.
        if (currentBlock == latestBlock) {
            latestBlock = await provider.getBlockNumber();
        }
    }

    console.log(`\n--- [ CATCH_UP ] Phase Completed - Latest Inspected Block ${latestBlock} ---\n`);
    return { latestBlock, amountFoundJobs };
}

/**
 * Fetches multiple blocks in parallel for performance.
 */
export async function bulkPullBlocks(
    provider: JsonRpcProvider,
    fromBlock: number,
    amountBlocks: number,
): Promise<(Block | null)[]> {
    const toBlock = fromBlock + amountBlocks;
    const blockPromises = [];
    for (let i = fromBlock; i < toBlock; i++) {
        blockPromises.push(provider.getBlock(i, true)); // true = prefetch transactions
    }

    return await Promise.all(blockPromises);
}

/**
 * Inspects multiple blocks in parallel to find worked jobs.
 * Updates metrics and handles found jobs automatically.
 */
export async function bulkInspectBlock(
    provider: JsonRpcProvider,
    blocks: (Block | null)[],
): Promise<number> {
    const inspectPromises = [];
    let amountFoundJobs = 0;

    if (!blocks.length) return 0;

    for (const block of blocks) {
        if (!block) continue;
        inspectPromises.push(
            findJobInBlock(provider, block).then((maybeJob) => {
                metrics.blocksProcessedCounter.inc();

                if (!maybeJob) return;

                amountFoundJobs++;
                handleFoundJob(maybeJob);
            }),
        );
    }

    await Promise.all(inspectPromises);
    return amountFoundJobs;
}

export function estimateCatchUpTime(
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

    return Math.ceil(remainingMs / 1000);
}
