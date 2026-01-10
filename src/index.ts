import { JsonRpcProvider } from 'ethers';
import { config } from './config.js';
import { EthProvider } from './eth/EthProvider.js';
import { initContract } from './eth/contracts/initContract.js';
import SequencerAbi from "./eth/contracts/Sequencer.abi.json" with { type: "json" };
import JobAbi from "./eth/contracts/Job.abi.json" with { type: "json" };
import { Interface } from 'ethers';
import { emitAlert } from './alerts.js';

const eth = await EthProvider.getInstance();
const provider = eth.getProvider();

type Job = {
    jobId: number,
    address: string,
    workable: boolean
}

let currentNetwork = ''
let activeJobs: Job[] = []
async function worker(){
    await catchUp();
    const { jobs, network } = await findActiveJobs(provider);
    if (!jobs.length) console.log("No active Jobs found")
        
    currentNetwork = network,
    activeJobs = jobs
    
    provider.on("block", async (blockNumber) => {
        console.log("New Block", blockNumber)

        const maybeWorkable = await checkWorkableJobs(provider, activeJobs, currentNetwork);

        //Compare maybeWorkable with activeJobs state to check whether a job became workable
        activeJobs.forEach((job: Job, i: number)=> {
            const {canWork, args} = maybeWorkable[i];
            // If there's no change in its workable state do nothing.
            if (canWork === job.workable) return;

            // If it was workable and became unworkable -> the job has been worked
            // an alert is emitted
            if (job.workable && !canWork) emitAlert({
                jobId: job.jobId,
                jobAddress: job.address,
                args,
                network: currentNetwork, 
                blockNumber
            })

            job.workable = canWork;
        });
    });
}

worker()
    .catch((err)=>{
        console.log(err);
        process.exit(1)
    })

//TODO: Catch up mechanic for last 1000 blocks
async function catchUp(){}

async function findActiveJobs(provider: JsonRpcProvider): Promise<{jobs: Job[], network: string}>{
    const {sequencerAddress, multiCallAddress} = config.eth;
    const sequencer = initContract(provider, sequencerAddress, 'SEQUENCER');
    const multicall = initContract(provider, multiCallAddress, 'MULTICALL')

    const numJobs = await sequencer.numJobs();
    const network: string = await sequencer.getMaster();
    
    if (!numJobs) return {jobs: [], network}

    const seqInterface = new Interface(SequencerAbi);

    const calls = [];
    for (let i = 0n; i < numJobs; i++) {
        calls.push({
            target: sequencerAddress,
            allowFailure: false,
            callData: seqInterface.encodeFunctionData("jobAt", [i])
        });
    }

    const results = await multicall.aggregate3.staticCall(calls);
    
    const jobAddresses: Job[] = results.map((r: any, i: number): Job => ({
        jobId: i,
        // Decode the address from the multicall response 
        address: seqInterface.decodeFunctionResult("jobAt", r[1])[0],
        workable: false
    }));

    return { jobs: jobAddresses, network }
}

function jobsAddresses(jobs: Job[]){
    return jobs.map((j)=>j.address)
}

async function checkWorkableJobs(provider: JsonRpcProvider, activeJobs: Job[], currentNetwork: string): Promise<{canWork: boolean, args: string}[]>{
    const {multiCallAddress} = config.eth;
    const multicall = initContract(provider, multiCallAddress, 'MULTICALL');

    const jobInterface = new Interface(JobAbi);
    const calls = activeJobs.map((job) => ({
            target: job.address,
            allowFailure: false,
            callData: jobInterface.encodeFunctionData("workable", [currentNetwork])
        }))

    const results = await multicall.aggregate3.staticCall(calls);

    return results.map((r: any)=> {
        const [canWork, args] = jobInterface.decodeFunctionResult("workable", r[1]);
        return {canWork, args}
    });
}
