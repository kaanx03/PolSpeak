"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import {
  fetchLibraryFiles,
  createLibraryFile,
  updateLibraryFile,
  deleteLibraryFile,
  toggleLibraryFilePin,
  fetchLibraryFolders,
  createLibraryFolder,
  updateLibraryFolder,
  deleteLibraryFolder,
  moveFileToFolder,
  LibraryFile as SupabaseLibraryFile,
  LibraryFolder as SupabaseLibraryFolder
} from "@/lib/supabase-helpers";

export interface LibraryFile {
  id: string;
  name: string;
  type: "pdf" | "image" | "audio" | "video" | "document";
  category: string;
  size: number;
  url: string;
  uploadedAt: Date;
  isPinned: boolean;
  folderId?: string | null;
}

export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

interface LibraryContextType {
  files: LibraryFile[];
  folders: LibraryFolder[];
  addFiles: (newFiles: LibraryFile[]) => void;
  deleteFile: (id: string) => Promise<void>;
  updateFile: (id: string, updates: Partial<LibraryFile>) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  // Folder operations
  addFolder: (name: string, color: string) => Promise<LibraryFolder>;
  editFolder: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  moveToFolder: (fileId: string, folderId: string | null) => Promise<void>;
  refreshFolders: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

// Helper to convert Supabase format to frontend format
function mapSupabaseToLibraryFile(file: SupabaseLibraryFile): LibraryFile {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    category: file.category,
    size: file.size,
    url: file.url,
    uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
    isPinned: file.is_pinned,
    folderId: file.folder_id,
  };
}

function mapSupabaseToLibraryFolder(folder: SupabaseLibraryFolder): LibraryFolder {
  return {
    id: folder.id,
    name: folder.name,
    color: folder.color,
    createdAt: folder.created_at ? new Date(folder.created_at) : new Date(),
  };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    loadFiles();
    loadFolders();
  }, []);

  const loadFiles = async () => {
    const supabaseFiles = await fetchLibraryFiles();
    const mappedFiles = supabaseFiles.map(mapSupabaseToLibraryFile);
    setFiles(mappedFiles);
    setIsLoaded(true);
  };

  const loadFolders = async () => {
    const supabaseFolders = await fetchLibraryFolders();
    const mappedFolders = supabaseFolders.map(mapSupabaseToLibraryFolder);
    setFolders(mappedFolders);
  };

  const addFiles = (newFiles: LibraryFile[]) => {
    setFiles((prev) => [...newFiles, ...prev]);
  };

  const deleteFile = async (id: string) => {
    try {
      await deleteLibraryFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  };

  const updateFile = async (id: string, updates: Partial<LibraryFile>) => {
    try {
      const supabaseUpdates: Partial<SupabaseLibraryFile> = {
        ...(updates.name && { name: updates.name }),
        ...(updates.type && { type: updates.type }),
        ...(updates.category && { category: updates.category }),
        ...(updates.size && { size: updates.size }),
        ...(updates.url && { url: updates.url }),
        ...(updates.isPinned !== undefined && { is_pinned: updates.isPinned }),
        ...(updates.folderId !== undefined && { folder_id: updates.folderId }),
      };

      await updateLibraryFile(id, supabaseUpdates);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  };

  const togglePin = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;

    try {
      await toggleLibraryFilePin(id, !file.isPinned);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isPinned: !f.isPinned } : f))
      );
    } catch (error) {
      console.error("Error toggling pin:", error);
      throw error;
    }
  };

  const refreshFiles = async () => {
    await loadFiles();
  };

  // Folder operations
  const addFolder = async (name: string, color: string): Promise<LibraryFolder> => {
    try {
      const newFolder = await createLibraryFolder({ name, color });
      const mappedFolder = mapSupabaseToLibraryFolder(newFolder);
      setFolders((prev) => [...prev, mappedFolder].sort((a, b) => a.name.localeCompare(b.name)));
      return mappedFolder;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  };

  const editFolder = async (id: string, updates: { name?: string; color?: string }) => {
    try {
      await updateLibraryFolder(id, updates);
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
  };

  const removeFolder = async (id: string) => {
    try {
      await deleteLibraryFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      // Update files that were in this folder
      setFiles((prev) =>
        prev.map((f) => (f.folderId === id ? { ...f, folderId: null } : f))
      );
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  };

  const moveToFolder = async (fileId: string, folderId: string | null) => {
    try {
      await moveFileToFolder(fileId, folderId);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, folderId } : f))
      );
    } catch (error) {
      console.error("Error moving file to folder:", error);
      throw error;
    }
  };

  const refreshFolders = async () => {
    await loadFolders();
  };

  return (
    <LibraryContext.Provider value={{
      files,
      folders,
      addFiles,
      deleteFile,
      updateFile,
      togglePin,
      refreshFiles,
      addFolder,
      editFolder,
      removeFolder,
      moveToFolder,
      refreshFolders
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
