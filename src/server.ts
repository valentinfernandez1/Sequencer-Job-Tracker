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

// Initialize AlertManager (Will error if configuration is incorrect) and MetricsManager
export function startInfraServices() {
    AlertManager.getInstance();
    const metrics = MetricsManager.getInstance();
    metrics.startServer();
}

main().catch((err) => {
    console.log(err);
    process.exit(1);
});
