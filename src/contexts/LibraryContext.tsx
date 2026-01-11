"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import {
  fetchLibraryFiles,
  createLibraryFile,
  updateLibraryFile,
  deleteLibraryFile,
  toggleLibraryFilePin,
  LibraryFile as SupabaseLibraryFile
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
}

interface LibraryContextType {
  files: LibraryFile[];
  addFiles: (newFiles: LibraryFile[]) => void;
  deleteFile: (id: string) => Promise<void>;
  updateFile: (id: string, updates: Partial<LibraryFile>) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
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
  };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const supabaseFiles = await fetchLibraryFiles();
    const mappedFiles = supabaseFiles.map(mapSupabaseToLibraryFile);
    setFiles(mappedFiles);
    setIsLoaded(true);
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

  return (
    <LibraryContext.Provider value={{ files, addFiles, deleteFile, updateFile, togglePin, refreshFiles }}>
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
