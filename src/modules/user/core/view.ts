import { UserModel, type UserDocument } from "../model.js";

export function findUserById(id: string, includePassword = false): Promise<UserDocument | null> {
  const query = UserModel.findOne({ _id: id, isDeleted: false });
  return (includePassword ? query.select("+passwordHash") : query).exec();
}
