import { findUserById } from "../../user/core/view.js";

export async function findConnectionStatus(userId: string) {
  const user = await findUserById(userId);
  return user?.connections || { linkedin: {}, naukri: {} };
}
