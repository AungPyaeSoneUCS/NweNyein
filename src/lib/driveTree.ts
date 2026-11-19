import type { DriveFile } from "./driveUrls";

export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

/** A Drive folder and everything nested underneath it. */
export interface DriveCollection {
  id: string;
  name: string;
  /** Folder names from the top-level collection down to this folder. */
  path: string[];
  depth: number;
  folders: DriveCollection[];
  files: DriveFile[];
  /** Recursive file count, including nested collections. */
  fileCount: number;
  /** Recursive sub-collection count. */
  collectionCount: number;
}

export interface DriveTree {
  rootId: string;
  /** Top-level folders: book collections, singers, or albums. */
  collections: DriveCollection[];
  /** Files directly in the root folder. */
  files: DriveFile[];
  /** Every non-folder file found under the root folder. */
  allFiles: DriveFile[];
  /** Every folder found under the root folder. */
  allCollections: DriveCollection[];
}

export function isDriveFolder(file: DriveFile): boolean {
  return file.mimeType === DRIVE_FOLDER_MIME;
}

export function isAudioFile(file: DriveFile): boolean {
  return (
    file.mimeType.startsWith("audio/") ||
    /\.(mp3|m4a|wav|ogg|aac|flac|opus)$/i.test(file.name)
  );
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

/** Builds a parent-to-child tree from a flat recursive Drive listing. */
export function buildDriveTree(rootId: string, entries: DriveFile[]): DriveTree {
  const childrenByParent = new Map<string, DriveFile[]>();

  for (const file of entries) {
    for (const parent of file.parents || []) {
      const children = childrenByParent.get(parent) || [];
      children.push(file);
      childrenByParent.set(parent, children);
    }
  }

  const seen = new Set<string>();

  const buildFolder = (
    folder: DriveFile,
    path: string[],
    depth: number
  ): DriveCollection => {
    seen.add(folder.id);

    const children = childrenByParent.get(folder.id) || [];
    const folders = children
      .filter(isDriveFolder)
      .filter((child) => !seen.has(child.id))
      .sort(byName)
      .map((child) => buildFolder(child, [...path, child.name], depth + 1));
    const files = children.filter((child) => !isDriveFolder(child)).sort(byName);

    return {
      id: folder.id,
      name: folder.name,
      path,
      depth,
      folders,
      files,
      fileCount: files.length + folders.reduce((sum, child) => sum + child.fileCount, 0),
      collectionCount: folders.length + folders.reduce((sum, child) => sum + child.collectionCount, 0),
    };
  };

  const rootChildren = childrenByParent.get(rootId) || [];
  const collections = rootChildren
    .filter(isDriveFolder)
    .sort(byName)
    .map((folder) => buildFolder(folder, [folder.name], 0));
  const files = rootChildren.filter((child) => !isDriveFolder(child)).sort(byName);

  const allCollections: DriveCollection[] = [];
  const allFiles: DriveFile[] = [...files];

  const collect = (collection: DriveCollection) => {
    allCollections.push(collection);
    allFiles.push(...collection.files);
    collection.folders.forEach(collect);
  };
  collections.forEach(collect);
  allFiles.sort(byName);

  return { rootId, collections, files, allFiles, allCollections };
}

export function findCollection(
  collections: DriveCollection[],
  id: string | null | undefined
): DriveCollection | null {
  if (!id) return null;
  for (const collection of collections) {
    if (collection.id === id) return collection;
    const nested = findCollection(collection.folders, id);
    if (nested) return nested;
  }
  return null;
}

/** Returns the selected collection followed by its ancestors, root first. */
export function collectionAncestors(
  collections: DriveCollection[],
  id: string | null | undefined
): DriveCollection[] {
  if (!id) return [];
  for (const collection of collections) {
    if (collection.id === id) return [collection];
    const nested = collectionAncestors(collection.folders, id);
    if (nested.length) return [collection, ...nested];
  }
  return [];
}

/** All files in a collection and its descendants. */
export function collectionFiles(collection: DriveCollection): DriveFile[] {
  return [
    ...collection.files,
    ...collection.folders.flatMap((child) => collectionFiles(child)),
  ];
}

/** Folder path for a file, useful as a collection label in search results. */
export function fileCollectionPath(tree: DriveTree, fileId: string): string[] | null {
  const file = tree.allFiles.find((candidate) => candidate.id === fileId);
  const parentId = file?.parents?.[0];
  if (!parentId) return null;
  return findCollectionById(tree.allCollections, parentId)?.path || null;
}

function findCollectionById(
  collections: DriveCollection[],
  id: string
): DriveCollection | null {
  for (const collection of collections) {
    if (collection.id === id) return collection;
    const nested = findCollectionById(collection.folders, id);
    if (nested) return nested;
  }
  return null;
}
