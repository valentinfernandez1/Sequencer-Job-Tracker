import { Contract } from "ethers";
import SequencerAbi from "./Sequencer.abi.json" with { type: "json" };
import MultiCall3Abi from "./MultiCall3.abi.json" with { type: "json" };
import JobAbi from "./Job.abi.json" with { type: "json" };
import { config } from "../../config.js";
import { JsonRpcProvider } from "ethers";

const {sequencerAddress, multiCallAddress} = config.eth
const ContractAbiMapping = {
    'SEQUENCER': SequencerAbi,
    'MULTICALL': MultiCall3Abi,
    'JOB': JobAbi
}

export type AbiType = keyof typeof ContractAbiMapping;

export function initContract(provider: JsonRpcProvider, address: string, abiType: AbiType): Contract {
    return new Contract(address, ContractAbiMapping[abiType], provider)
}
