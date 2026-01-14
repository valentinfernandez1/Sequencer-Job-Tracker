import { Contract, JsonRpcProvider } from "ethers";

import JobAbi from "./Job.abi.json" with { type: "json" };
import MultiCall3Abi from "./MultiCall3.abi.json" with { type: "json" };
import SequencerAbi from "./Sequencer.abi.json" with{ type: "json" };

// Mapping of contract type and ABI
const ContractAbiMapping = {
    SEQUENCER: SequencerAbi,
    MULTICALL: MultiCall3Abi,
    JOB: JobAbi,
};

export type AbiType = keyof typeof ContractAbiMapping;

/**
 * Initializes a contract instance with the appropriate ABI.
 * 
 * @param provider - JSON RPC provider
 * @param address - Contract address
 * @param abiType - Type of contract: Currently available options ("SEQUENCER" | "MULTICALL" | "JOB")
 */
export function initContract(
    provider: JsonRpcProvider,
    address: string,
    abiType: AbiType,
): Contract {
    return new Contract(address, ContractAbiMapping[abiType], provider);
}
