export interface CookiePayloadItem {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface ExtensionPairPayload {
  extensionVersion: string;
  browserName?: string;
}

export interface SyncCookiesPayload {
  platform: "linkedin" | "naukri" | "indeed";
  cookies: CookiePayloadItem[];
}
