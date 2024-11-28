"use client";

import { BrianToolkit } from "@brian-ai/langchain";
import { BaseChain } from "langchain/chains";
import { AvaCloudSDK } from "@avalabs/avacloud-sdk";

export class PortfolioManager {
    private agent: BaseChain | null;
    private toolkit: BrianToolkit;
    private avaCloud: AvaCloudSDK;
    private lastScanTime: number = 0;
    private readonly SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes

    constructor(agent: BaseChain | null, toolkit: BrianToolkit) {
        this.agent = agent;
        this.toolkit = toolkit;

        this.avaCloud = new AvaCloudSDK({
            apiKey: process.env["GLACIER_API_KEY"],
            chainId: "43114",
            network: "mainnet",
        });

        if (typeof window !== 'undefined') {
            this.avaCloud = new AvaCloudSDK({
                apiKey: process.env.NEXT_PUBLIC_GLACIER_API_KEY,
                chainId: "43114",
                network: "mainnet",
            });
        }
    }

    async scanAndOptimize() {
        if (!this.agent || !this.avaCloud) {
            return null;
        }

        const currentTime = Date.now();
        if (currentTime - this.lastScanTime < this.SCAN_INTERVAL) {
            return null;
        }

        try {
            const balances = await this.getPortfolioBalances();

            const yieldAnalysis = await this.agent.invoke({
                input: `Analyze yield opportunities on Avalanche with these balances: ${JSON.stringify(balances)}`
            });

            const execution = await this.agent.invoke({
                input: `Based on the analysis, execute the most profitable yield strategy with:
                - Max 70% allocation per protocol
                - Min $1000 liquidity per pool
                - Avoid new protocols (<30 days)`
            });

            this.lastScanTime = currentTime;
            return execution;

        } catch (error) {
            console.error("Portfolio optimization failed:", error);
            return null;
        }
    }

    private async getPortfolioBalances() {
        if (!this.avaCloud) return null;

        return await this.avaCloud.data.evm.balances.listErc20Balances({
            pageSize: 100,
            address: process.env.NEXT_PUBLIC_WALLET_ADDRESS as string,
        });
    }
}