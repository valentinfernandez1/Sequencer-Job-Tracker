import { config } from "../config.js";
import { WorkedJob } from "../worker/jobs.js";

export type AlertData = {
    jobAddress: string;
    network: string;
    blockNumber: number;
};

export class AlertMannager {
    private static instance: AlertMannager | null = null;
    private discordWH!: string;
    private slackWH!: string;

    private constructor() {
        const { discordWH, slackWH } = config.alerts;

        if (discordWH === undefined) {
            console.log(
                "[DISCORD_WEBHOOK] ENV variable is not set. Slack notifications will be disabled",
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

    static getInstance(): AlertMannager {
        if (AlertMannager.instance) return AlertMannager.instance;

        const instance = new AlertMannager();

        AlertMannager.instance = instance;
        return instance;
    }

    private static craftMsg(w: WorkedJob) {
        return `ℹ️ *A Job has been worked:*\n- Keeper Network Id: ${w.network}\n- Job Address: ${w.address} - (https://etherscan.io/address/${w.address})\n- Block Number: ${w.blockNumber} - (https://etherscan.io/block/${w.blockNumber})`;
    }

    public emitAlerts(workedJob: WorkedJob): void {
        const alertMsg = AlertMannager.craftMsg(workedJob);

        this.dispatchDiscordAlert(alertMsg);
        this.dispatchSlackAlert(alertMsg);
        return;
    }

    private async dispatchDiscordAlert(msg: string) {
        if (!this.discordWH) return;

        await fetch(this.discordWH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: msg,
            }),
        });
    }

    private async dispatchSlackAlert(msg: string) {
        if (!this.slackWH) return;

        await fetch(this.slackWH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg }),
        });
    }
}
