export interface ConnectionStatus {
  linkedin: {
    isConnected: boolean;
    username: string | null;
    lastSyncAt: Date | null;
  };
  naukri: {
    isConnected: boolean;
    username: string | null;
    lastSyncAt: Date | null;
  };
}
