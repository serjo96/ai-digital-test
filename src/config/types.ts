export type NodeEnv = 'development' | 'production' | 'test';

export type AiProviderName = 'ollama' | 'openai';

/** Runtime secrets and endpoints. Model names, prices and prompts stay in committed JSON under config/. */
export type AiEnvConfig = {
  defaultProvider: AiProviderName;
  ollamaBaseUrl: string;
  openAiApiKey: string | null;
  openAiBaseUrl: string;
};

export type PathsConfig = {
  feed: string;
  taxonomy: string;
  labels: string;
  reportsDir: string;
};

export type AppConfig = {
  nodeEnv: NodeEnv;
  paths: PathsConfig;
  ai: AiEnvConfig;
};
