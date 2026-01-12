import { BlockTag } from "ethers";
import { config } from "../config.js";
import { initContract } from "../eth/contracts/initContract.js";
import { JsonRpcProvider } from "ethers";

import { Block } from "ethers";
import { AlertMannager } from "../alerts/AlertMannager.js";

export type Jobs = Set<string>;
export type WorkedJob = {
    address: string,
    blockNumber: number,
    network: string,
}

export async function findActiveJobs(provider: JsonRpcProvider, blockTag: BlockTag): Promise<Jobs>{
    const {sequencerAddress, multiCallAddress} = config.eth;
    const sequencer = initContract(provider, sequencerAddress, 'SEQUENCER');
    const multicall = initContract(provider, multiCallAddress, 'MULTICALL')

    const numJobs = await sequencer.numJobs({blockTag});
    
    if (!numJobs) return new Set()

    const calls = [];
    for (let i = 0n; i < numJobs; i++) {
        calls.push({
            target: sequencerAddress,
            allowFailure: false,
            callData: sequencer.interface.encodeFunctionData("jobAt", [i])
        });
    }

    const results = await multicall.aggregate3.staticCall(calls, {blockTag});
    
    const jobs: Jobs = new Set() 
    
    results.forEach((r: any, i: number) => {
        // Decode the address from the multicall response 
        const address = sequencer.interface.decodeFunctionResult("jobAt", r[1])[0];
        jobs.add(address.toLowerCase())
    });

    return jobs 
}

export async function findJobInBlock(provider: JsonRpcProvider, block: Block): Promise< WorkedJob| null >{
    if (!block.prefetchedTransactions) return null;
    const jobs = await findActiveJobs(provider, 'latest');

    let workedJob: WorkedJob | null = null;
    for (const tx of block.prefetchedTransactions) {
        if (!tx.to || !jobs.has(tx.to.toLowerCase())) continue;

        const address = tx.to.toLowerCase();
        const jobContract = initContract(provider, address, 'JOB');

        const decoded = jobContract.interface.parseTransaction({
            data: tx.data,
            value: tx.value
        });

        if (!decoded || decoded.name !== 'work') continue
        
        const sequencer = initContract(provider, config.eth.sequencerAddress, 'SEQUENCER');
        const network = await sequencer.getMaster();
        
        workedJob = {
            address,
            blockNumber: block.number,
            network
        }

        break
    }

    return workedJob
}

export async function handleFoundJob(workedJob: WorkedJob){
    //emitAlert
    const alertManager = AlertMannager.getInstance().emitAlerts(workedJob);
    
    //Add prometheous metric
}