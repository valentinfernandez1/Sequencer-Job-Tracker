import { Contract } from "ethers";
import SequencerAbi from "./Sequencer.abi.json" with { type: "json" };
import MultiCall3 from "./MultiCall3.abi.json" with { type: "json" };
import { config } from "../../config.js";
import { JsonRpcProvider } from "ethers";

const {sequencerAddress, multiCallAddress} = config.eth
const ContractMapping = {
    [sequencerAddress]: SequencerAbi,
    [multiCallAddress]: MultiCall3
}

export function initContract(provider: JsonRpcProvider, address: string): Contract {
    return new Contract(address, ContractMapping[address], provider)
}
