import { JsonRpcProvider } from "ethers";

import { AlertManager } from "./alerts/AlertManager.js";
import { EthProvider } from "./eth/EthProvider.js";
import { MetricsManager } from "./metrics/MetricsManager.js";
import { catchUp } from "./worker/catchUp.js";
import { findJobInBlock, handleFoundJob } from "./worker/jobs.js";

async function main() {
    const eth = await EthProvider.getInstance();

    startInfraServices();
    await startKeeper(eth.getProvider());
}

/**
 * Starts the keeper service that monitors blockchain blocks for job transactions.
 * First catches up on historical blocks (configured via CATCH_UP_DEPTH), then
 * subscribes to new blocks in real time.
 *
 * The block subscription runs indefinitely until the provider connection is closed.
 */
export async function startKeeper(provider: JsonRpcProvider) {
    const metrics = MetricsManager.getInstance();
    // Catch up with historical data
    await catchUp(provider);

    // Live block subscription
    provider.on("block", async (blockNumber) => {
        console.log(`[ JOB_INSPECTOR ] Incomming block: ${blockNumber} - Inspecting...`);
        const block = await provider.getBlock(blockNumber, true);

        metrics.blocksProcessedCounter.inc();

        if (!block) return;

        const workedJob = await findJobInBlock(provider, block);
        if (!workedJob) return;

        handleFoundJob(workedJob);

        metrics.currentBlockGauge.set(blockNumber);
    });
}

/**
 * Initialize AlertManager (Will error if configuration is incorrect)
 * and MetricsManager + metrics server (for prometheus to pull data from)
 */
export function startInfraServices() {
    AlertManager.getInstance();
    const metrics = MetricsManager.getInstance();
    metrics.startServer();
}

main().catch((err) => {
    console.log(err);
    process.exit(1);
});
