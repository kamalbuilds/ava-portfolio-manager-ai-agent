"use client";

import { ChatOpenAI } from "@langchain/openai";
import { createBrianAgent } from "@brian-ai/langchain";

export const initializeAgent = async (config: {
    brianApiKey: string;
    privateKey: string;
    openAiKey: string;
}) => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const agent = await createBrianAgent({
            apiKey: config.brianApiKey,
            privateKeyOrAccount: config.privateKey as `0x${string}`,
            llm: new ChatOpenAI({
                apiKey: config.openAiKey,
                modelName: "gpt-4-turbo-preview",
                temperature: 0.2
            }),
        });

        return agent;
    } catch (error) {
        console.error("Agent initialization failed:", error);
        return null;
    }
};