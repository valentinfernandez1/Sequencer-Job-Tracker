import { ethers, JsonRpcProvider } from "ethers";
import { config } from "../config.js";

export class EthProvider {
    private static instance: EthProvider | null = null;
    private provider!: JsonRpcProvider;

    private constructor() {}

    static async getInstance(): Promise<EthProvider> {
        if (EthProvider.instance) return EthProvider.instance;

        const instance = new EthProvider();
        await instance.init();

        EthProvider.instance = instance;
        return instance;
    }

    private async init() {
        const { rpc } = config.eth;

        const provider = new ethers.JsonRpcProvider(rpc);

        // Check RPC Connection
        await provider.send("eth_chainId", []);

        this.provider = provider;
    }

    getProvider(): JsonRpcProvider {
        return this.provider;
    }
}