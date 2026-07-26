export interface CreateApiKeyPayload {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}

export interface ApiKeyCreatedResponse {
  _id: string;
  name: string;
  key: string; // Plaintext returned only once upon creation
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeySummary {
  _id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}
