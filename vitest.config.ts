import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["./src/**/*.test.ts"],
        exclude: ["tests/integration/**/*.int.test.ts"],
        globals: true,
    },
});
