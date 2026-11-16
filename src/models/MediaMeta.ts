import mongoose, { Schema, type Document, type Model } from "mongoose";

export type MediaKind = "songs" | "books";

export interface IMediaMeta extends Document {
  kind: MediaKind;
  fileId: string;
  coverImageDriveId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaMetaSchema = new Schema<IMediaMeta>(
  {
    kind: { type: String, required: true, enum: ["songs", "books"], index: true },
    fileId: { type: String, required: true, trim: true },
    coverImageDriveId: { type: String, trim: true },
  },
  { timestamps: true }
);

MediaMetaSchema.index({ kind: 1, fileId: 1 }, { unique: true });

const MediaMeta: Model<IMediaMeta> =
  mongoose.models.MediaMeta || mongoose.model<IMediaMeta>("MediaMeta", MediaMetaSchema);

export default MediaMeta;
