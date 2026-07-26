import mongoose from "mongoose";
import { ResumeModel } from "../model.js";

export async function softDeleteResume(id: string, userId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) return;
  await ResumeModel.updateOne({ 
    _id: new mongoose.Types.ObjectId(id), 
    userId: new mongoose.Types.ObjectId(userId) 
  }, { $set: { deletedAt: new Date() } });
}
