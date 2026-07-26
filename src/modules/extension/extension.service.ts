import crypto from "node:crypto";
import {
  findExtensionPairingByUserId,
  upsertExtensionPairing,
  updateExtensionHeartbeat,
  disconnectExtensionPairing,
  createPairingPinRecord,
  findValidPairingPin,
  markPairingPinUsed
} from "./core/index.js";
import { connectionService } from "../connections/service.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { CookiePayloadItem } from "./types.js";

export class ExtensionService {
  async generatePairingPin(userId: string) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await createPairingPinRecord(userId, pin, expiresAt);
    return { pin, expiresAt: expiresAt.toISOString() };
  }

  async pairWithPin(pin: string, extensionVersion: string, browserName = "Chrome") {
    const pinRecord = await findValidPairingPin(pin);
    if (!pinRecord) {
      throw new Error("Invalid or expired pairing PIN");
    }

    const userId = pinRecord.userId.toString();
    await markPairingPinUsed(pin);
    const pairing = await upsertExtensionPairing(userId, extensionVersion, browserName);
    const extensionToken = signAccessToken({ sub: userId, email: "", role: "user" });

    return {
      success: true,
      extensionToken,
      userId,
      pairing
    };
  }

  async pairExtension(userId: string, extensionVersion: string, browserName = "Chrome") {
    return upsertExtensionPairing(userId, extensionVersion, browserName);
  }

  async heartbeat(userId: string) {
    return updateExtensionHeartbeat(userId);
  }

  async syncCookies(
    userId: string,
    platform: "linkedin" | "naukri" | "indeed",
    cookies: CookiePayloadItem[]
  ) {
    const rawCookieStr = JSON.stringify(cookies);
    await connectionService.saveEncryptedCookies(userId, platform, rawCookieStr);
    await updateExtensionHeartbeat(userId);
    return { success: true, platform, syncedCount: cookies.length, timestamp: new Date().toISOString() };
  }

  async getExtensionStatus(userId: string) {
    const [pairing, connectionsStatus] = await Promise.all([
      findExtensionPairingByUserId(userId),
      connectionService.getConnectionStatus(userId)
    ]);

    const isExtensionActive = pairing?.status === "active";
    const lastSyncAt = pairing?.lastHeartbeatAt ? pairing.lastHeartbeatAt.toISOString() : null;

    return {
      pairing: pairing
        ? {
            isPaired: isExtensionActive,
            extensionVersion: pairing.extensionVersion,
            browserName: pairing.browserName,
            pairedAt: pairing.pairedAt,
            lastHeartbeatAt: pairing.lastHeartbeatAt
          }
        : { isPaired: false, extensionVersion: null, browserName: null, pairedAt: null, lastHeartbeatAt: null },
      platforms: connectionsStatus,
      lastSyncAt
    };
  }

  async disconnectExtension(userId: string) {
    return disconnectExtensionPairing(userId);
  }
}

export const extensionService = new ExtensionService();
