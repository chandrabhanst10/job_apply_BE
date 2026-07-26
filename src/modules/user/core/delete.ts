import { UserModel, type UserDocument } from "../model.js";

export function softDeleteUser(id: string): Promise<UserDocument | null> {
  return UserModel.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true }).exec();
}
