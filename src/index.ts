import { AlertMannager } from "./alerts/AlertMannager.js";
import { EthProvider } from "./eth/EthProvider.js";
import { catchUp } from "./worker/catchUp.js";
import { findJobInBlock, handleFoundJob } from "./worker/jobs.js";

async function main() {
    const eth = await EthProvider.getInstance();
    const provider = eth.getProvider();

    // Initialize AlertManager (While error if configuration is incorrect)
    AlertMannager.getInstance();

    const latestBlock = await catchUp(provider);
    console.log(` --- CatchUp Phase Completed - Latest Inspected Block ${latestBlock} ---`);

    provider.on("block", async (blockNumber) => {
        console.log(`Incomming block: ${blockNumber} - Inspecting...`);
        const block = await provider.getBlock(blockNumber, true);
        if (!block) return;
        const workedJob = await findJobInBlock(provider, blockNumber);

        if (!workedJob) return;

        handleFoundJob(workedJob);
    });
}

main().catch((err) => {
    console.log(err);
    process.exit(1);
});
