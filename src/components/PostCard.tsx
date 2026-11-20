"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarDays, UserRound } from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import { getPhotoUrl } from "@/lib/driveUrls";
import type { PostCategory } from "@/lib/postCategories";

interface PostCardProps {
  title: string;
  slug: string;
  category: PostCategory;
  content: string;
  author?: string;
  coverImageDriveId?: string;
  createdAt: string | Date;
}

const categoryStyles: Record<string, string> = {
  knowledge: "bg-amber-100/80 text-amber-900",
  history: "bg-maroon/10 text-maroon",
};

export default function PostCard({ title, slug, category, content, author, coverImageDriveId, createdAt }: PostCardProps) {
  const href = category === "knowledge" ? `/knowledge/${slug}` : "/history";
  const categoryStyle = categoryStyles[category];
  return (
    <motion.article
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      className="card group flex h-full flex-col overflow-hidden"
    >
      {coverImageDriveId ? (
        <div className="relative h-48 w-full overflow-hidden bg-maroon/5">
          <Image
            src={getPhotoUrl(coverImageDriveId)}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ) : (
        <div className="h-2 w-full bg-gradient-to-r from-saffron/70 via-amber-300/60 to-maroon/40" />
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {categoryStyle && (
            <span className={`rounded-full px-2.5 py-1 font-medium capitalize ${categoryStyle}`}>
              {category}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-slate-500">
            <CalendarDays size={13} />
            <time dateTime={new Date(createdAt).toISOString()}>{formatDate(createdAt)}</time>
          </span>
        </div>
        <h3 className="text-lg font-semibold leading-snug text-maroon line-clamp-2">
          <Link href={href} className="hover:text-saffron-dark transition-colors">{title}</Link>
        </h3>
        {author && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
            <UserRound size={14} /> {author}
          </p>
        )}
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700 line-clamp-3">{truncate(content, 150)}</p>
        <div className="mt-5">
          <Link href={href} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-saffron-dark hover:text-maroon">
            Read more <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
