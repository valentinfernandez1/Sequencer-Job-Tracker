process.loadEnvFile();

export function envOrThrow(key: string) {
    const val = process.env[key];
    if (!val) throw new Error(`Environment variable ${key} is not set`);

    return val;
}

type Config = {
    eth: {
        rpc: string;
        sequencerAddress: string;
        multiCallAddress: string;
        catchUpDepth: number;
        batchPullAmount: number;
        rateLimitingDelay: number;
    };
    alerts: {
        discordWH?: string;
        slackWH?: string;
    };
    metrics: {
        port: number;
    };
};

const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
export const config: Config = {
    eth: {
        rpc: envOrThrow("ETH_RPC"),
        sequencerAddress: envOrThrow("SEQUENCER_ADDRESS"),
        multiCallAddress: MULTICALL_ADDRESS,
        catchUpDepth: Number(process.env["CATCH_UP_DEPTH"]) || 0,
        batchPullAmount: Number(process.env["BATCH_PULL_AMOUNT"]) || 20,
        rateLimitingDelay: Number(process.env["RATE_LIMITING_DELAY"]) || 0,
    },
    alerts: {
        discordWH: process.env["DISCORD_WEBHOOK"],
        slackWH: process.env["SLACK_WEBHOOK"],
    },
    metrics: {
        port: Number(process.env["PROMETHEUS_METRIC_PORT"]) || 9100,
    },
};
