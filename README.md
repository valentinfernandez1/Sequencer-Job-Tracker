# Challenge: Automation Workable Alert

## Project Overview

The Keeper Network Monitor is a service designed to monitor on-chain MakerDAO jobs. It inspects blocks to find if any active jobs that have been set up in the [Sequencer](https://etherscan.io/address/0x238b4E35dAed6100C6162fAE4510261f88996EC9#code) have been worked, collects and exposes metrics for Prometheus and handles alerts through discord and slack.

On start up it will check for the last X amount of blocks (configured with CATCH_UP_DEPTH, see [Configuration](#configuration)) to verify if any jobs have been worked and then subscribe to block notifications to detect jobs on every block import.

## Installation

Clone the repository

```bash
git clone https://github.com/wonderland-quests/challenge-backend-valentinfernandez1.git
cd challenge-backend-valentinfernandez1
```

Install the dependencies

```bash
# Install dependencies
yarn install

# OR with npm
npm install
```

## Configuration

The project requires a set of environment variables, stored in a .env file at the root of the project. A full example of how to structure the file can be found in [./env.example](.env.example). You can copy this file and adjust the values as needed for your environment.

Some variables require access to external services and may need additional setup:

-   **Ethereum node**: Needed for blockchain interaction (`ETH_RPC`)
-   **Alert providers**: Required to use Discord and Slack alerts. For more information on how to set them up follow the [alert providers guide](./docs/alerts.md).

Make sure all required variables are set before running the project or tests.

## How to run

The easiest way to run the Keeper Network Monitor and its dependencies is with Docker Compose.

### 1. Prerequisites

-   Docker installed
-   Docker Compose installed
-   A configured .env file. (See [Configuration](#configuration))

### 2. Start the services

From the root of the project, run:

```bash
docker compose up --build
# or if its already built
docker compose up
```

This will start:

-   keeper-network-monitor: the keeper network monitor application.
-   prometheus: for collecting and visualizing metrics. For more information on how to visualize the metrics follow the [prometheus guide](./docs/prometheus.md).

## Running tests

This project uses Vitest for running the Tests. Tests are split into unit tests and integration tests.

### Unit Tests

Run all unit tests:

```bash
yarn run test:unit
#or
npm run test:unit
```

### Integration Tests

Integration tests require a forked Ethereum network to simulate real blockchain interactions. For this reason [Anvil](https://github.com/foundry-rs/foundry) is required as it allow to run forked mainnet state locally.

#### Installing Anvil

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Make sure anvil is available (It might requires bash to be restarted)

```bash
anvil --version
```

#### Running Integration Tests

Start the integration tests:

```bash
yarn test:integration
#or
npm run test:integration
```

The tests automatically start a forked Ethereum node using Anvil. Tests clean up the fork after running.

### Running all tests

To run both unit and integration tests:

```bash
yarn test
#or
npm run test
```
