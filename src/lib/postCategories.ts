export const POST_CATEGORIES = ["knowledge", "history"] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export interface PostCategoryStats {
  total: number;
  published: number;
  draft: number;
  latest: string | null;
}

export type PostCategoryCounts = Record<PostCategory, PostCategoryStats>;

export function createPostCategoryCounts(): PostCategoryCounts {
  return POST_CATEGORIES.reduce((counts, category) => {
    counts[category] = { total: 0, published: 0, draft: 0, latest: null };
    return counts;
  }, {} as PostCategoryCounts);
}

export function isPostCategory(value: unknown): value is PostCategory {
  return (
    typeof value === "string" &&
    (POST_CATEGORIES as readonly string[]).includes(value)
  );
}
