import { AlertManager } from "./alerts/AlertManager.js";
import { EthProvider } from "./eth/EthProvider.js";
import { MetricsManager } from "./metrics/MetricsManager.js";
import { catchUp } from "./worker/catchUp.js";
import { findJobInBlock, handleFoundJob } from "./worker/jobs.js";

async function main() {
    const eth = await EthProvider.getInstance();
    const provider = eth.getProvider();

    // Initialize AlertManager (Will error if configuration is incorrect) and MetricsManager
    AlertManager.getInstance();
    const metrics = MetricsManager.getInstance();
    metrics.startServer();

    const latestBlock = await catchUp(provider);
    console.log(` --- CatchUp Phase Completed - Latest Inspected Block ${latestBlock} ---`);

    provider.on("block", async (blockNumber) => {
        console.log(`Incomming block: ${blockNumber} - Inspecting...`);
        const block = await provider.getBlock(blockNumber, true);

        metrics.blocksProcessedCounter.inc();

        if (!block) return;
        const workedJob = await findJobInBlock(provider, blockNumber);

        if (!workedJob) return;

        handleFoundJob(workedJob);

        metrics.currentBlockGauge.set(blockNumber);
    });
}

main().catch((err) => {
    console.log(err);
    process.exit(1);
});
