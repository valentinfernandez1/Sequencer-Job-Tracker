import http from "http";
import client from "prom-client";

import { config } from "../config.js";

/**
 * Singleton Class that manages Prometheus metrics and HTTP server for scraping.
 */
export class MetricsManager {
    private static instance: MetricsManager | null = null;
    /** Prometheus registry*/
    public readonly register = client.register;

    // Metrics
    public readonly jobsWorkedCounter: client.Counter<"job">;
    public readonly currentBlockGauge: client.Gauge;
    public readonly blocksProcessedCounter: client.Counter;
    public readonly validationErrorsCounter: client.Counter;

    /** HTTP server exposing /metrics endpoint */
    private server?: http.Server;

    private constructor() {
        // Collect Node.js default metrics once
        client.collectDefaultMetrics({
            prefix: "keeper_",
        });

        this.jobsWorkedCounter = new client.Counter({
            name: "keeper_jobs_worked_total",
            help: "Number of jobs successfully worked",
            labelNames: ["job"],
        });

        this.currentBlockGauge = new client.Gauge({
            name: "keeper_current_block",
            help: "Latest block processed by the keeper",
        });

        this.blocksProcessedCounter = new client.Counter({
            name: "keeper_blocks_processed_total",
            help: "Total number of blocks processed",
        });

        this.validationErrorsCounter = new client.Counter({
            name: "keeper_validation_errors_total",
            help: "Total number of validation errors",
        });
    }

    /**
     * Returns the singleton MetricsManager instance.
     * Creates and initializes metrics on first call.
     */
    static getInstance(): MetricsManager {
        if (!MetricsManager.instance) {
            MetricsManager.instance = new MetricsManager();
        }
        return MetricsManager.instance;
    }

    /**
     * Starts the HTTP server to expose metrics at /metrics endpoint.
     */
    startServer(): void {
        if (this.server) return;

        const { port } = config.metrics;

        this.server = http.createServer(async (req, res) => {
            if (req.url === "/metrics") {
                res.statusCode = 200;
                res.setHeader("Content-Type", this.register.contentType);
                res.end(await this.register.metrics());
                return;
            }

            res.statusCode = 404;
            res.end("Not Found");
        });

        this.server.listen(port, () => {
            console.log(`[ METRIC_MANAGER ] Prometheus listening on :${port}/metrics`);
        });
    }

    /**
     * Stops the metrics HTTP server if running.
     */
    stopServer(): void {
        if (this.server) this.server.close();
        return;
    }
}
