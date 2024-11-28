"use client";

import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { initializeAgent } from './config';
import { PortfolioManager } from './portfolio-manager';
import { BrianToolkit } from "@brian-ai/langchain";
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

export default function AgentDashboard() {
    const [portfolioStats, setPortfolioStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const setupAgent = async () => {
            try {
                const agent = await initializeAgent({
                    brianApiKey: process.env['NEXT_PUBLIC_BRIAN_API_KEY']!,
                    privateKey: process.env['NEXT_PUBLIC_AGENT_PRIVATE_KEY']!,
                    openAiKey: process.env['NEXT_PUBLIC_API_KEY_OPENAI']!
                });

                const toolkit = new BrianToolkit({
                    apiKey: process.env['NEXT_PUBLIC_BRIAN_API_KEY']!,
                    privateKeyOrAccount: process.env['NEXT_PUBLIC_AGENT_PRIVATE_KEY']! as `0x${string}`,
                });

                const portfolioManager = new PortfolioManager(agent, toolkit);
                console.log(portfolioManager,"portfolio manager",agent)

                // Initial scan
                const stats = await portfolioManager.scanAndOptimize();
                setPortfolioStats(stats);
                setIsLoading(false);

                // Set up interval for continuous monitoring
                setInterval(async () => {
                    const updatedStats = await portfolioManager.scanAndOptimize();
                    setPortfolioStats(updatedStats);
                }, 5 * 60 * 1000);

            } catch (error) {
                console.error("Agent setup failed:", error);
                setIsLoading(false);
            }
        };

        setupAgent();
    }, []);

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-purple-700 to-blue-500 p-8 text-white">
                <h1 className="text-4xl font-bold mb-8 text-center">AI Portfolio Manager</h1>

                {isLoading ? (
                    <div className="text-center">Loading agent...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <Card title="Portfolio Status">
                            <pre className="whitespace-pre-wrap">
                                {JSON.stringify(portfolioStats, null, 2)}
                            </pre>
                        </Card>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}