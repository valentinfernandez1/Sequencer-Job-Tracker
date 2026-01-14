import { Block, BlockTag, Interface, JsonRpcProvider } from "ethers";
import { z } from "zod";

import { AlertManager } from "../alerts/AlertManager.js";
import { config } from "../config.js";
import { ContractAbiMapping, initContract } from "../eth/contracts/initContract.js";
import { MetricsManager } from "../metrics/MetricsManager.js";

/** Set of active job contract addresses */
export type Jobs = Set<string>;

export const WorkedJobSchema = z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    blockNumber: z.number().int().nonnegative(),
    network: z.string().min(1),
});

export type WorkedJob = z.infer<typeof WorkedJobSchema>;

/**
 * Fetches all active job addresses from the sequencer at a specific block.
 * Makes use of the Multicall3 contract for efficient batched calls.
 */
export async function findActiveJobs(provider: JsonRpcProvider, blockTag: BlockTag): Promise<Jobs> {
    const { sequencerAddress, multiCallAddress } = config.eth;
    const sequencer = initContract(provider, sequencerAddress, "SEQUENCER");
    const multicall = initContract(provider, multiCallAddress, "MULTICALL");

    const numJobs = await sequencer.numJobs({ blockTag });

    if (!numJobs) return new Set();

    // Build multicall batch to fetch all job addresses in a single RPC call
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

    results.forEach((r: any) => {
        // r[1] contains the returnData from the multicall response
        const address = sequencer.interface.decodeFunctionResult("jobAt", r[1])[0];
        jobs.add(address.toLowerCase());
    });

    return jobs;
}

/*
 * Searches a block for transactions that worked a job.
 */
export async function findJobInBlock(
    provider: JsonRpcProvider,
    block: Block,
): Promise<WorkedJob | null> {
    if (!block.prefetchedTransactions) return null;

    let workedJob: WorkedJob | null = null;
    for (const tx of block.prefetchedTransactions) {
        // Attempt to find a transaction with the work() transaction signature

        // It must have been sent TO a smart contract address.
        if (!tx.to) continue;
        const recipientAddress = tx.to.toLowerCase();

        const I_jobContract = new Interface(ContractAbiMapping.JOB);

        // Parse transaction to check if it's calling the "work" function
        const decoded = I_jobContract.parseTransaction({
            data: tx.data,
            value: tx.value,
        });
        if (!decoded || decoded.name !== "work") continue;

        // A job has been found. Now verify whether that transaction matches one from
        // the activeJobs registered in the sequencer.

        const jobs = await findActiveJobs(provider, block.number);

        if (!jobs.has(recipientAddress)) continue;

        const sequencer = initContract(provider, config.eth.sequencerAddress, "SEQUENCER");
        const network = await sequencer.getMaster();

        workedJob = {
            address: recipientAddress,
            blockNumber: block.number,
            network,
        };

        break;
    }
    if (!workedJob) return workedJob;

    const parsedJob = WorkedJobSchema.safeParse(workedJob);

    if (!parsedJob.success) {
        console.warn("[ JOB_INSPECTOR ] Invalid WorkedJob", {
            errors: parsedJob.error.issues,
            workedJob,
        });
        MetricsManager.getInstance().validationErrorsCounter.inc();
        return null;
    }
    return parsedJob.data;
}

/**
 * Handles a found job by sending alerts and updating metrics.
 */
export async function handleFoundJob(workedJob: WorkedJob) {
    AlertManager.getInstance().emitAlerts(workedJob);
    MetricsManager.getInstance().jobsWorkedCounter.inc();
}
