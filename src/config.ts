process.loadEnvFile();

export function envOrThrow(key: string) {
    const val = process.env[key];
    if (!val) throw new Error(`Environment variable ${key} is not set`);
    
    return val;
}

type Config = {
    eth: {
        rpc: string
        blockConfirmations: number
        sequencerAddress: string,
        multiCallAddress: string,
    }
}

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
export const config: Config = {
    eth: {
        rpc: envOrThrow("ETH_RPC"),
        blockConfirmations: Number(envOrThrow("BLOCK_CONFIRMATIONS")),
        sequencerAddress: envOrThrow("SEQUENCER_ADDRESS"),
        multiCallAddress: MULTICALL_ADDRESS,
    }
}