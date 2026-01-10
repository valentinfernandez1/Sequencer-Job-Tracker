import { JsonRpcProvider } from 'ethers';
import { config } from './config.js';
import { EthProvider } from './eth/EthProvider.js';
import { initContract } from './eth/contracts/initContract.js';
import SequencerAbi from "./eth/contracts/Sequencer.abi.json" with { type: "json" };
import { Interface } from 'ethers';
import { Result } from 'ethers';

const eth = await EthProvider.getInstance();
const provider = eth.getProvider();

async function worker(){
    await catchUp();
    
    const jobs = await findActiveJobs(provider);
    
    if (!jobs.length) console.log("No active Jobs found")
        
    const {blockConfirmations} = config.eth;
        
   /*  const latest = await provider.getBlockNumber();
    console.log(await provider.getLogs({
        fromBlock: latest - blockConfirmations, 
        toBlock: latest,
        address: [],
    })) */
}
worker()
    .then(() => process.exit(0))
    .catch((err)=>{
        console.log(err);
        process.exit(1)
    })

//TODO: Catch up mechanic for last 1000 blocks
async function catchUp(){}

async function findActiveJobs(provider: JsonRpcProvider): Promise<string[]>{
    const {sequencerAddress, multiCallAddress} = config.eth;
    const sequencer = initContract(provider, sequencerAddress);
    const multicall = initContract(provider, multiCallAddress)

    const numJobs = await sequencer.numJobs();
    if (!numJobs) return []

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
    
    // Format the batched results to properly match the Jobs addresses
    const jobAddresses = results.map((r: Result[]) => `0x${r[1].slice(-40)}`)

    return jobAddresses
}