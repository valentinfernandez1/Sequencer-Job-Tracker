import { z, ZodError } from "zod";

if (process.env.NODE_ENV !== "test") {
    try {
        process.loadEnvFile();
    } catch {}
}

export const EnvSchema = z.object({
    ETH_RPC: z.url(),

    SEQUENCER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

    DISCORD_WEBHOOK: z.url().optional(),
    SLACK_WEBHOOK: z.url().optional(),

    CATCH_UP_DEPTH: z.coerce.number().int().nonnegative().default(0),
    BATCH_PULL_AMOUNT: z.coerce.number().int().positive().default(20),
    RATE_LIMITING_DELAY: z.coerce.number().int().nonnegative().default(0),

    PROMETHEUS_METRIC_PORT: z.coerce.number().int().min(1).max(65535).default(9100),
});

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

let env;
try {
    env = EnvSchema.parse(process.env);
} catch (error) {
    throw new Error(`Missing or incorrectly configured ENV variables:\n${error}`);
}
export const config: Config = {
    eth: {
        rpc: env.ETH_RPC,
        sequencerAddress: env.SEQUENCER_ADDRESS,
        multiCallAddress: MULTICALL_ADDRESS,
        catchUpDepth: env.CATCH_UP_DEPTH,
        batchPullAmount: env.BATCH_PULL_AMOUNT,
        rateLimitingDelay: env.RATE_LIMITING_DELAY,
    },
    alerts: {
        discordWH: env.DISCORD_WEBHOOK,
        slackWH: env.SLACK_WEBHOOK,
    },
    metrics: {
        port: env.PROMETHEUS_METRIC_PORT,
    },
};
