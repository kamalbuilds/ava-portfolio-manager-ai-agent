// @ts-nocheck
import {
    type BrianAgentOptions,
    BrianToolkit,
    XMTPCallbackHandler,
} from "@brian-ai/langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ChatXAI } from "@langchain/xai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { ChatMessageHistory } from "langchain/memory";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { FunctorService } from '../services/functorService.ts';
import { KestraService } from '../services/kestraService';
import { OrchestrationAgent } from './orchestrationAgent';

// Initialize Kestra service
const kestraService = new KestraService();

// Message history store
const store: Record<string, ChatMessageHistory> = {};

function getMessageHistory(sessionId: string) {
    if (!(sessionId in store)) {
        store[sessionId] = new ChatMessageHistory();
    }
    return store[sessionId];
}

// DeFiLlama Tools Definition
const defiLlamaToolkit = {
    getTVLTool: new DynamicStructuredTool({
        name: "get_protocol_tvl",
        description: "Get current and historical TVL data for a protocol",
        schema: z.object({
            protocol: z.string().describe("Protocol name/slug"),
        }),
        func: async ({ protocol }) => {
            const response = await fetch(`https://api.llama.fi/protocol/${protocol}`);

            console.log(response, "response from the api");
            const data = await response.json();
            return JSON.stringify({
                name: data.name,
                tvl: data.tvl,
                chainTvls: data.chainTvls,
                currentChainTvls: data.currentChainTvls,
            });
        },
    }),

    getYieldsTool: new DynamicStructuredTool({
        name: "get_yield_pools",
        description: "Get yield/APY data for DeFi pools",
        schema: z.object({
            chain: z.string().optional().describe("Optional chain filter"),
        }),
        func: async ({ chain }) => {
            const response = await fetch("https://yields.llama.fi/pools");
            const data = await response.json();
            const pools = data.data
                .filter((pool: any) => !chain || pool.chain === chain)
                .slice(0, 10)
                .map((pool: any) => ({
                    chain: pool.chain,
                    project: pool.project,
                    symbol: pool.symbol,
                    tvlUsd: pool.tvlUsd,
                    apy: pool.apy,
                }));
            return JSON.stringify(pools);
        },
    }),

    getDexVolumesTool: new DynamicStructuredTool({
        name: "get_dex_volumes",
        description: "Get DEX trading volume data",
        schema: z.object({
            chain: z.string().optional().describe("Optional chain filter"),
        }),
        func: async ({ chain }) => {
            const endpoint = chain ?
                `https://api.llama.fi/overview/dexs/${chain}` :
                'https://api.llama.fi/overview/dexs';
            const response = await fetch(endpoint);
            const data = await response.json();
            const volumes = data.protocols
                .slice(0, 10)
                .map((dex: any) => ({
                    name: dex.name,
                    chain: dex.chain,
                    dailyVolume: dex.dailyVolume,
                    totalVolume: dex.totalVolume,
                }));
            return JSON.stringify(volumes);
        },
    }),
};

// Tools Definition
const coingeckoTool = new DynamicStructuredTool({
    name: "get_token_price",
    description: "Get the current price of any cryptocurrency token",
    schema: z.object({
        tokenId: z.string().describe("The token ID from CoinGecko"),
    }),
    func: async ({ tokenId }) => {
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${tokenId}`,
                {
                    headers: {
                        "x-cg-demo-api-key": process.env["NEXT_PUBLIC_COINGECKO_API_KEY"]!,
                    },
                }
            );
            const data = await response.json();
            return `${tokenId.toUpperCase()} price: $${data.market_data.current_price.usd}`;
        } catch (error) {
            return `Error fetching ${tokenId} price`;
        }
    },
});

// Add Kestra tools
const kestraTools = [
    new DynamicStructuredTool({
        name: "execute_workflow",
        description: "Execute a Kestra workflow for orchestrated operations",
        schema: z.object({
            namespace: z.string(),
            flowId: z.string(),
            inputs: z.any().optional()
        }),
        func: async ({ namespace, flowId, inputs }) => {
            return await kestraService.executeWorkflow(namespace, flowId, inputs);
        }
    }),
    new DynamicStructuredTool({
        name: "check_workflow_status",
        description: "Check the status of a Kestra workflow execution",
        schema: z.object({
            executionId: z.string()
        }),
        func: async ({ executionId }) => {
            return await kestraService.getExecutionStatus(executionId);
        }
    })
];

export interface Agent {
    id: string;
    name: string;
    description: string;
    agent: RunnableWithMessageHistory<Record<string, any>, ChainValues>;
}

export const createSpecializedAgents = async (baseOptions: BrianAgentOptions): Promise<Agent[]> => {
    // Trading Agent with Kestra orchestration
    const tradingAgent = await createAgent({
        ...baseOptions,
        tools: [...kestraTools, coingeckoTool],
        instructions: `You are a specialized trading agent with workflow orchestration capabilities.
            You can execute and monitor complex trading operations using Kestra workflows.
            Focus on price analysis and trading opportunities.`,
    });

    // Liquidity Pool Agent
    const liquidityAgent = await createAgent({
        ...baseOptions,
        tools: [defiLlamaToolkit.getTVLTool],
        instructions: "You are a liquidity pool specialist. Help users find and analyze liquidity pools.",
    });

    // DeFiLlama Analysis Agent
    const defiLlamaAgent = await createAgent({
        ...baseOptions,
        tools: Object.values(defiLlamaToolkit),
        instructions: `You are a DeFi analytics specialist powered by DeFiLlama data.
            You can:
            - Track TVL across protocols and chains
            - Analyze yield opportunities and APY trends
            - Monitor DEX volumes and trading activity
            - Compare different protocols and chains
            Always provide data-driven insights and recommendations.`,
    });

    // Add Orchestration Agent
    const orchestrationAgent = new OrchestrationAgent();
    await orchestrationAgent.initialize([
        'avalanche',
        'ethereum',
        'base',
        'mode'
    ]);

    // Update Portfolio Agent with orchestration capabilities
    const portfolioAgent = await createAgent({
        ...baseOptions,
        tools: [
            ...kestraTools,
            coingeckoTool,
            defiLlamaToolkit.getTVLTool,
            // Add new orchestration tools
            new DynamicStructuredTool({
                name: "execute_cross_chain_rebalance",
                description: "Execute portfolio rebalancing across multiple chains",
                schema: z.object({
                    operations: z.array(z.object({
                        sourceChain: z.string(),
                        targetChain: z.string(),
                        amount: z.string(),
                        denom: z.string(),
                        targetAddress: z.string()
                    }))
                }),
                func: async ({ operations }) => {
                    return await orchestrationAgent.executePortfolioRebalance(operations);
                }
            })
        ],
        instructions: `You are a portfolio management specialist with cross-chain orchestration capabilities.
            You can orchestrate complex portfolio operations across multiple chains.
            Help users optimize their portfolio allocation while maintaining efficiency and security.`
    });

    return [
        {
            id: 'trading',
            name: 'Trading Agent',
            description: 'Specializes in price analysis and trading opportunities',
            agent: tradingAgent
        },
        {
            id: 'liquidity',
            name: 'Liquidity Pool Agent',
            description: 'Analyzes liquidity pools and provides insights',
            agent: liquidityAgent
        },
        {
            id: 'portfolio',
            name: 'Portfolio Manager',
            description: 'Helps optimize portfolio allocation and management',
            agent: portfolioAgent
        },
        {
            id: 'defi-analytics',
            name: 'DeFi Analytics',
            description: 'Provides comprehensive DeFi market analysis using DeFiLlama data',
            agent: defiLlamaAgent
        },
        {
            id: 'orchestration',
            name: 'Orchestration Manager',
            description: 'Manages cross-chain portfolio operations',
            agent: orchestrationAgent
        }
    ];
};

// Base Agent Creation Function
const createAgent = async ({
    apiKey,
    privateKeyOrAccount,
    llm,
    tools = [],
    instructions,
    apiUrl,
    xmtpHandler,
    xmtpHandlerOptions,
}: BrianAgentOptions & { tools?: DynamicStructuredTool[] }) => {

    const brianToolkit = new BrianToolkit({
        apiKey,
        apiUrl,
        privateKeyOrAccount,
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", instructions],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
    ]);

    // Initialize Functor Network integration
    const functorTools = [
        new DynamicStructuredTool({
            name: "create_smart_account",
            description: "Create a smart account using Functor Network",
            schema: z.object({
                owner: z.string(),
                recoveryMechanism: z.array(z.string()),
                paymaster: z.string()
            }),
            func: async ({ owner, recoveryMechanism, paymaster }) => {
                return await FunctorService.createSmartAccount({
                    owner,
                    recoveryMechanism,
                    paymaster
                });
            }
        }),
        // Add more Functor-specific tools as needed
    ];

    const agent = createToolCallingAgent({
        llm,
        tools: [...tools, ...functorTools, ...brianToolkit.tools],
        prompt,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools: [...tools, ...functorTools, ...brianToolkit.tools],
        callbacks: xmtpHandler
            ? [new XMTPCallbackHandler(xmtpHandler, llm, instructions!, xmtpHandlerOptions)]
            : [],
    });

    return new RunnableWithMessageHistory({
        runnable: agentExecutor,
        getMessageHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
    });
};

// Usage Example
export const initializeAgents = async () => {
    const baseOptions = {
        apiKey: process.env["NEXT_PUBLIC_BRIAN_API_KEY"]!,
        privateKeyOrAccount: process.env["NEXT_PUBLIC_PRIVATE_KEY"] as `0x${string}`,
        llm: new ChatOpenAI({
            apiKey: process.env["NEXT_PUBLIC_OPENAI_API_KEY"]!,
        }),
    };

    const agents = await createSpecializedAgents(baseOptions);
    return agents;
}; 