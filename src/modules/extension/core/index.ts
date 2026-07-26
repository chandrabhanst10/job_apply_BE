import { ExtensionPairingModel, type IExtensionPairing } from "../extension.model.js";
import { PairingPinModel, type IPairingPin } from "../pairingPin.model.js";

export async function findExtensionPairingByUserId(userId: string): Promise<IExtensionPairing | null> {
  return ExtensionPairingModel.findOne({ userId }).exec();
}

export async function upsertExtensionPairing(
  userId: string,
  extensionVersion: string,
  browserName = "Chrome"
): Promise<IExtensionPairing> {
  return ExtensionPairingModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        extensionVersion,
        browserName,
        pairedAt: new Date(),
        lastHeartbeatAt: new Date(),
        status: "active"
      }
    },
    { upsert: true, new: true }
  ).exec();
}

export async function updateExtensionHeartbeat(userId: string): Promise<IExtensionPairing | null> {
  return ExtensionPairingModel.findOneAndUpdate(
    { userId },
    { $set: { lastHeartbeatAt: new Date(), status: "active" } },
    { new: true }
  ).exec();
}

export async function disconnectExtensionPairing(userId: string): Promise<IExtensionPairing | null> {
  return ExtensionPairingModel.findOneAndUpdate(
    { userId },
    { $set: { status: "disconnected" } },
    { new: true }
  ).exec();
}

export async function createPairingPinRecord(userId: string, pin: string, expiresAt: Date): Promise<IPairingPin> {
  await PairingPinModel.deleteMany({ userId });
  return PairingPinModel.create({ userId, pin, expiresAt });
}

export async function findValidPairingPin(pin: string): Promise<IPairingPin | null> {
  return PairingPinModel.findOne({ pin, isUsed: false, expiresAt: { $gt: new Date() } }).exec();
}

export async function markPairingPinUsed(pin: string): Promise<void> {
  await PairingPinModel.updateOne({ pin }, { $set: { isUsed: true } }).exec();
}

