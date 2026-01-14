import { spawn } from "child_process";

async function main() {
    console.log("[CI] Starting Anvil fork...");
    const FORK_RPC_NODE = process.env.FORK_RPC_NODE;
    if (!FORK_RPC_NODE) throw new Error("[ FORK_RPC_NODE ] not defined in .env.integration");

    const anvil = spawn("anvil", [
        "--fork-url",
        FORK_RPC_NODE,
        "--fork-block-number",
        "24228415",
        "--port",
        "8545",
        "--chain-id",
        "31337",
    ]);

    // Give anvil time to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("[CI] Running integration tests...");
    const vitest = spawn("yarn", ["vitest", "run", "./src/tests/integration"], {
        stdio: "inherit",
    });

    vitest.on("exit", (code) => {
        console.log("[CI] Killing Anvil fork...");
        anvil.kill("SIGTERM");
        process.exit(code || 0);
    });

    vitest.on("error", (err) => {
        console.error("[CI] Vitest failed:", err);
        anvil.kill("SIGTERM");
        process.exit(1);
    });
}

main();
