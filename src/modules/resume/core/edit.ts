import mongoose from "mongoose";
import { ResumeModel, type ResumeDocument } from "../model.js";

export async function setResumeStatus(id: string, status: ResumeDocument["status"]): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) return;
  await ResumeModel.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { status } });
}

export async function updateResumePath(id: string, newPath: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(id)) return;
  await ResumeModel.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { path: newPath } });
}
