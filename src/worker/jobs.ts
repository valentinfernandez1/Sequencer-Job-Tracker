import { Block, BlockTag, JsonRpcProvider } from "ethers";
import { z } from "zod";

import { AlertManager } from "../alerts/AlertManager.js";
import { config } from "../config.js";
import { initContract } from "../eth/contracts/initContract.js";
import { MetricsManager } from "../metrics/MetricsManager.js";

export type Jobs = Set<string>;

export const WorkedJobSchema = z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    blockNumber: z.number().int().nonnegative(),
    network: z.string().min(1),
});

export type WorkedJob = z.infer<typeof WorkedJobSchema>;

export async function findActiveJobs(provider: JsonRpcProvider, blockTag: BlockTag): Promise<Jobs> {
    const { sequencerAddress, multiCallAddress } = config.eth;
    const sequencer = initContract(provider, sequencerAddress, "SEQUENCER");
    const multicall = initContract(provider, multiCallAddress, "MULTICALL");

    const numJobs = await sequencer.numJobs({ blockTag });

    if (!numJobs) return new Set();

    const calls = [];
    for (let i = 0n; i < numJobs; i++) {
        calls.push({
            target: sequencerAddress,
            allowFailure: false,
            callData: sequencer.interface.encodeFunctionData("jobAt", [i]),
        });
    }

    const results = await multicall.aggregate3.staticCall(calls, { blockTag });

    const jobs: Jobs = new Set();

    results.forEach((r: any, i: number) => {
        // Decode the address from the multicall response
        const address = sequencer.interface.decodeFunctionResult("jobAt", r[1])[0];
        jobs.add(address.toLowerCase());
    });

    return jobs;
}

export async function findJobInBlock(
    provider: JsonRpcProvider,
    block: Block,
): Promise<WorkedJob | null> {
    if (!block.prefetchedTransactions) return null;
    const jobs = await findActiveJobs(provider, "latest");

    let workedJob: WorkedJob | null = null;
    for (const tx of block.prefetchedTransactions) {
        if (!tx.to || !jobs.has(tx.to.toLowerCase())) continue;

        const address = tx.to.toLowerCase();
        const jobContract = initContract(provider, address, "JOB");

        const decoded = jobContract.interface.parseTransaction({
            data: tx.data,
            value: tx.value,
        });

        if (!decoded || decoded.name !== "work") continue;

        const sequencer = initContract(provider, config.eth.sequencerAddress, "SEQUENCER");
        const network = await sequencer.getMaster();

        workedJob = {
            address,
            blockNumber: block.number,
            network,
        };

        break;
    }

    return WorkedJobSchema.parse(workedJob);
}

export async function handleFoundJob(workedJob: WorkedJob) {
    // Send alerts to third party webhooks
    AlertManager.getInstance().emitAlerts(workedJob);

    // Prometheous metric
    MetricsManager.getInstance().jobsWorkedCounter.inc();
}
