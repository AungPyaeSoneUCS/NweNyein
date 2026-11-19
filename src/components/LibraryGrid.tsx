"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  BookOpenCheck,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Home,
  LibraryBig,
} from "lucide-react";
import {
  formatFileSize,
  getDownloadUrl,
  getFileBadge,
  getPhotoUrl,
  type DriveFile,
} from "@/lib/driveUrls";
import {
  collectionAncestors,
  fileCollectionPath,
  findCollection,
  type DriveCollection,
  type DriveTree,
} from "@/lib/driveTree";
import SearchBar from "./SearchBar";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";

function CollectionCard({
  collection,
  onClick,
}: {
  collection: DriveCollection;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="card flex h-full w-full items-start gap-3 p-4 text-left transition hover:border-amber-300/80 hover:shadow-md sm:p-5"
    >
      <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-maroon/10 text-maroon">
        <Folder size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold leading-snug text-maroon">
          {collection.name}
        </span>
        <span className="mt-1.5 block text-xs text-slate-500">
          {collection.fileCount} {collection.fileCount === 1 ? "document" : "documents"}
          {collection.collectionCount > 0 &&
            ` · ${collection.collectionCount} sub-collection${collection.collectionCount === 1 ? "" : "s"}`}
        </span>
      </span>
      <ChevronRight size={17} className="mt-1 flex-none text-slate-400" />
    </motion.button>
  );
}

export default function LibraryGrid({
  tree,
  covers = {},
}: {
  tree: DriveTree;
  covers?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const activeCollection = useMemo(
    () => findCollection(tree.collections, activeFolderId),
    [tree.collections, activeFolderId]
  );
  const ancestors = useMemo(
    () => collectionAncestors(tree.collections, activeFolderId),
    [tree.collections, activeFolderId]
  );
  const visibleFolders = activeCollection ? activeCollection.folders : tree.collections;
  const visibleFiles = activeCollection ? activeCollection.files : tree.files;

  const suggestions = useMemo(
    () => [
      ...tree.allCollections.map((folder) => folder.name),
      ...tree.allFiles.map((file) => file.name.replace(/\.[^/.]+$/, "")),
    ],
    [tree]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return tree.allFiles.filter((file) => {
      const path = fileCollectionPath(tree, file.id)?.join(" ") || "";
      return (
        file.name.toLowerCase().includes(q) || path.toLowerCase().includes(q)
      );
    });
  }, [tree, query]);

  const renderFile = (file: DriveFile, collectionLabel?: string | null) => {
    const badge = getFileBadge(file.mimeType, file.name);
    const title = file.name.replace(/\.[^/.]+$/, "");
    const cover = covers[file.id];
    return (
      <StaggerItem key={file.id}>
        <div className="card flex h-full flex-col p-5 sm:p-6">
          {cover && (
            <div className="mb-4 overflow-hidden rounded-xl border border-amber-900/10 bg-amber-50/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(cover)}
                alt=""
                loading="lazy"
                className="h-36 w-full object-cover"
              />
            </div>
          )}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-saffron/10 text-saffron-dark">
              {badge === "PDF" ? <BookOpen size={22} /> : <FileText size={22} />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="break-words font-semibold leading-snug text-maroon">{title}</h3>
              {collectionLabel && (
                <p className="mt-1 break-words text-xs text-saffron-dark">{collectionLabel}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-maroon/10 px-2.5 py-1 font-semibold text-maroon">{badge}</span>
                {file.size && <span className="text-slate-500">{formatFileSize(file.size)}</span>}
              </div>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
            <Link href={`/library/${file.id}`} className="btn-primary text-sm">
              <BookOpenCheck size={16} /> Read
            </Link>
            <a href={getDownloadUrl(file.id)} className="btn-outline text-sm" target="_blank" rel="noopener noreferrer">
              <Download size={16} /> Download
            </a>
          </div>
        </div>
      </StaggerItem>
    );
  };

  const hasAnyContent = tree.collections.length > 0 || tree.allFiles.length > 0;

  return (
    <div className="space-y-7">
      {hasAnyContent && (
        <SearchBar
          value={query}
          onChange={setQuery}
          suggestions={suggestions}
          placeholder="Search collections, books and documents..."
          ariaLabel="Search library documents"
        />
      )}

      {searchResults ? (
        <section>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-maroon md:text-2xl">Search results</h2>
            <span className="text-sm text-slate-500">{searchResults.length} documents</span>
          </div>
          {searchResults.length > 0 ? (
            <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {searchResults.map((file) =>
                renderFile(file, fileCollectionPath(tree, file.id)?.join(" / "))
              )}
            </StaggerGrid>
          ) : (
            <div className="card p-8 text-center text-slate-600">
              No documents match your search.
            </div>
          )}
        </section>
      ) : (
        <>
          {activeFolderId && (
            <nav className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600" aria-label="Collection breadcrumb">
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-2 text-saffron-dark hover:bg-amber-50"
              >
                <Home size={15} /> All collections
              </button>
              {ancestors.map((folder, index) => (
                <span key={folder.id} className="flex items-center gap-1.5">
                  <ChevronRight size={14} className="text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`inline-flex min-h-[36px] items-center rounded-xl px-2 hover:bg-amber-50 ${
                      index === ancestors.length - 1 ? "font-semibold text-maroon" : "text-saffron-dark"
                    }`}
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </nav>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold text-maroon md:text-2xl">
                  {activeFolderId ? <FolderOpen size={20} /> : <LibraryBig size={20} />}
                  {activeFolderId ? "Sub-collections" : "Collections"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeFolderId
                    ? "Open a sub-collection to see the documents inside it."
                    : "Choose a collection to browse its books and documents."}
                </p>
              </div>
              <span className="text-sm text-slate-500">
                {visibleFolders.length} {visibleFolders.length === 1 ? "collection" : "collections"}
              </span>
            </div>

            {visibleFolders.length > 0 ? (
              <StaggerGrid className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {visibleFolders.map((folder) => (
                  <StaggerItem key={folder.id}>
                    <CollectionCard
                      collection={folder}
                      onClick={() => {
                        setActiveFolderId(folder.id);
                        setQuery("");
                      }}
                    />
                  </StaggerItem>
                ))}
              </StaggerGrid>
            ) : (
              <div className="card p-5 text-sm text-slate-600">
                No sub-collections here. Documents are listed below.
              </div>
            )}
          </section>

          {(visibleFiles.length > 0 || (activeCollection && activeCollection.folders.length === 0)) && (
            <section>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold text-maroon md:text-2xl">
                  {activeCollection ? `Documents in ${activeCollection.name}` : "General documents"}
                </h2>
                <span className="text-sm text-slate-500">
                  {visibleFiles.length} {visibleFiles.length === 1 ? "document" : "documents"}
                </span>
              </div>
              {visibleFiles.length > 0 ? (
                <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                  {visibleFiles.map((file) => renderFile(file))}
                </StaggerGrid>
              ) : (
                <div className="card p-8 text-center text-slate-600">
                  No documents in this collection yet.
                </div>
              )}
            </section>
          )}
        </>
      )}

      {!hasAnyContent && (
        <div className="card p-8 text-center text-slate-600">
          No documents available in the library yet.
        </div>
      )}
    </div>
  );
}
