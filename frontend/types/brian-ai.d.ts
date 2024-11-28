declare module "@brian-ai/langchain" {
  export function createBrianAgent(config: {
    apiKey: string;
    privateKeyOrAccount: `0x${string}`;
    llm: any;
  }): any;

  
}
