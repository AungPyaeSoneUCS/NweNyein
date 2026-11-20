import mongoose, { Schema, type Document, type Model } from "mongoose";
import { POST_CATEGORIES, type PostCategory } from "@/lib/postCategories";

export type { PostCategory } from "@/lib/postCategories";

export interface IPost extends Document {
  title: string;
  slug: string;
  category: PostCategory;
  content: string;
  author?: string;
  coverImageDriveId?: string;
  driveAlbumFolderId?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: {
      type: String,
      required: true,
      enum: [...POST_CATEGORIES],
      index: true,
    },
    content: { type: String, required: true },
    author: { type: String, trim: true },
    coverImageDriveId: { type: String, trim: true },
    driveAlbumFolderId: { type: String, trim: true },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PostSchema.index({ category: 1, published: 1, createdAt: -1 });

const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
