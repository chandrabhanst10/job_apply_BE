import { updateUserConnection } from "../../user/core/edit.js";

export async function updateAccountConnection(
  userId: string,
  platform: "linkedin" | "naukri",
  data: { isConnected?: boolean; cookies?: string | null; username?: string | null; lastSyncAt?: Date | null }
) {
  return updateUserConnection(userId, platform, data);
}
