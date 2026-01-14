import { config } from "../config.js";
import { WorkedJob } from "../worker/jobs.js";

export type AlertData = {
    jobAddress: string;
    network: string;
    blockNumber: number;
};

// Currently supported third party providers
type ThirdPartyProviders = "discord" | "slack";

export type AlertThirdPartyStatus = {
    [K in ThirdPartyProviders]: boolean;
};

/**
 * Singleton Class that manages alert notifications to Discord and Slack webhooks.
 */
export class AlertManager {
    private static instance: AlertManager | null = null;
    private discordWH!: string;
    private slackWH!: string;

    private constructor() {
        const { discordWH, slackWH } = config.alerts;

        if (discordWH === undefined) {
            console.log(
                "[ DISCORD_WEBHOOK ] ENV variable is not set. Slack notifications will be disabled",
            );
        } else if (discordWH) {
            if (!discordWH.includes("discord.com/api/webhooks/"))
                throw new Error("Invalid Discord Web Hook URL Provided");
            this.discordWH = discordWH;
        }

        if (slackWH === undefined) {
            console.log(
                "[ SLACK_WEBHOOK ] ENV variable is not set. Slack notifications will be disabled\n",
            );
        } else if (slackWH) {
            if (!slackWH.includes("hooks.slack.com/services/"))
                throw new Error("Invalid Slack Web Hook URL Provided");
            this.slackWH = slackWH;
        }
    }

    /**
     * Return the singleton AlertManager instance.
     */
    static getInstance(): AlertManager {
        if (AlertManager.instance) return AlertManager.instance;

        const instance = new AlertManager();

        AlertManager.instance = instance;
        return instance;
    }

    private static craftMsg(w: WorkedJob) {
        return `ℹ️ *A Job has been worked:*\n- Keeper Network Id: ${w.network}\n- Job Address: ${w.address} - (https://etherscan.io/address/${w.address})\n- Block Number: ${w.blockNumber} - (https://etherscan.io/block/${w.blockNumber})`;
    }

    /**
     * Sends alert notifications for a worked job to all configured providers
     */
    public emitAlerts(workedJob: WorkedJob): AlertThirdPartyStatus {
        const alertMsg = AlertManager.craftMsg(workedJob);
        console.log(
            `[ ALERT_MANAGER ] A job has been found - address:${workedJob.address}, blockNumber${workedJob.blockNumber}, keeperNetworkId ${workedJob.network}`,
        );

        return {
            discord: this.dispatchDiscordAlert(alertMsg),
            slack: this.dispatchSlackAlert(alertMsg),
        };
    }

    /**
     * Sends alert to Discord webhook. Returns false if functionality disabled
     */
    private dispatchDiscordAlert(msg: string): boolean {
        if (!this.discordWH) return false;

        fetch(this.discordWH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: msg,
            }),
        });

        return true;
    }

    /**
     * Sends alert to slack webhook. Returns false if functionality disabled
     */
    private dispatchSlackAlert(msg: string): boolean {
        if (!this.slackWH) return false;

        fetch(this.slackWH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg }),
        });

        return true;
    }
}
