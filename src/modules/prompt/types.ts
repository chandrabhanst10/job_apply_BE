export interface DefaultPromptItemInput {
  promptKey: string;
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  version: number;
}

export interface PromptItemResponse {
  promptKey: string;
  name: string;
  category: string;
  description: string;
  defaultPrompt: string;
  currentPrompt: string;
  version: number;
  isCustomized: boolean;
  updatedAt: string;
}

export interface PromptTestResult {
  output: string;
}
