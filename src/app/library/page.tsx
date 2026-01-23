"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useLibrary, LibraryFile, LibraryFolder } from "@/contexts/LibraryContext";
import { uploadFile, createLibraryFile } from "@/lib/supabase-helpers";
import { processFileForUpload } from "@/lib/image-compression";
import PdfThumbnail from "@/components/PdfThumbnail";
import PdfViewer from "@/components/PdfViewer";

const FOLDER_COLORS = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Teal", value: "bg-teal-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Yellow", value: "bg-yellow-500" },
];

export default function LibraryPage() {
  const {
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
    moveToFolder
  } = useLibrary();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pdf" | "image" | "audio" | "document">("all");
  const [selectedFile, setSelectedFile] = useState<LibraryFile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFile, setEditingFile] = useState<LibraryFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<LibraryFile | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder states
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<LibraryFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderColorInput, setFolderColorInput] = useState("bg-blue-500");
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<LibraryFolder | null>(null);
  const [showMoveToFolderMenu, setShowMoveToFolderMenu] = useState<string | null>(null);

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + " minutes ago";
    if (seconds < 7200) return "1 hour ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " hours ago";
    if (seconds < 172800) return "yesterday";
    if (seconds < 604800) return Math.floor(seconds / 86400) + " days ago";
    return Math.floor(seconds / 604800) + " weeks ago";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetFolderId?: string | null) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    try {
      const filePromises = Array.from(uploadedFiles).map(async (file) => {
        const fileType = getFileType(file.type);
        const fileName = file.name;

        const { processedFile, valid, message } = await processFileForUpload(file);

        if (!valid) {
          alert(message || "File too large");
          throw new Error(message || "File too large");
        }

        const { url, storagePath } = await uploadFile(processedFile, "library");

        const libraryFile = await createLibraryFile({
          name: fileName.replace(/\.[^/.]+$/, ""),
          type: fileType,
          category: "Uncategorized",
          size: processedFile.size,
          url: url,
          storage_path: storagePath,
          is_pinned: false,
          folder_id: targetFolderId || selectedFolderId || null,
        });

        return {
          id: libraryFile.id,
          name: libraryFile.name,
          type: libraryFile.type,
          category: libraryFile.category,
          size: libraryFile.size,
          url: libraryFile.url,
          uploadedAt: new Date(libraryFile.created_at || new Date()),
          isPinned: libraryFile.is_pinned,
          folderId: libraryFile.folder_id,
        };
      });

      const newFiles = await Promise.all(filePromises);
      addFiles(newFiles);
      await refreshFiles();
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Error uploading files. Please try again.");
    }
  };

  const getFileType = (mimeType: string): LibraryFile["type"] => {
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("image")) return "image";
    if (mimeType.includes("audio")) return "audio";
    if (mimeType.includes("video")) return "video";
    return "document";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles) return;

    try {
      const filePromises = Array.from(droppedFiles).map(async (file) => {
        const fileType = getFileType(file.type);
        const fileName = file.name;

        const { processedFile, valid, message } = await processFileForUpload(file);

        if (!valid) {
          alert(message || "File too large");
          throw new Error(message || "File too large");
        }

        const { url, storagePath } = await uploadFile(processedFile, "library");

        const libraryFile = await createLibraryFile({
          name: fileName.replace(/\.[^/.]+$/, ""),
          type: fileType,
          category: "Uncategorized",
          size: processedFile.size,
          url: url,
          storage_path: storagePath,
          is_pinned: false,
          folder_id: selectedFolderId || null,
        });

        return {
          id: libraryFile.id,
          name: libraryFile.name,
          type: libraryFile.type,
          category: libraryFile.category,
          size: libraryFile.size,
          url: libraryFile.url,
          uploadedAt: new Date(libraryFile.created_at || new Date()),
          isPinned: libraryFile.is_pinned,
          folderId: libraryFile.folder_id,
        };
      });

      const newFiles = await Promise.all(filePromises);
      addFiles(newFiles);
      await refreshFiles();
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Error uploading files. Please try again.");
    }
  };

  const handleTogglePin = (id: string) => {
    togglePin(id);
    setShowMenu(null);
  };

  const handlePreviewFile = (file: LibraryFile) => {
    setSelectedFile(file);
    setShowPreview(true);
    setShowMenu(null);
  };

  const handleEdit = (file: LibraryFile) => {
    setEditingFile(file);
    setNameInput(file.name);
    setCategoryInput(file.category);
    setShowEditModal(true);
    setShowMenu(null);
  };

  const handleSaveEdit = () => {
    if (editingFile && nameInput.trim()) {
      updateFile(editingFile.id, {
        name: nameInput.trim(),
        category: categoryInput.trim() || "Uncategorized"
      });
      setShowEditModal(false);
      setEditingFile(null);
      setNameInput("");
      setCategoryInput("");
    }
  };

  const handleDeleteClick = (file: LibraryFile) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
    setShowMenu(null);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete.id);
      setShowDeleteModal(false);
      setFileToDelete(null);
    }
  };

  // Folder handlers
  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderNameInput("");
    setFolderColorInput("bg-blue-500");
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: LibraryFolder) => {
    setEditingFolder(folder);
    setFolderNameInput(folder.name);
    setFolderColorInput(folder.color);
    setShowFolderModal(true);
    setShowFolderMenu(null);
  };

  const handleSaveFolder = async () => {
    if (!folderNameInput.trim()) return;

    try {
      if (editingFolder) {
        const newName = folderNameInput.trim();
        await editFolder(editingFolder.id, {
          name: newName,
          color: folderColorInput
        });

        // Update category of all files in this folder to new folder name
        const filesInFolder = files.filter(f => f.folderId === editingFolder.id);
        for (const file of filesInFolder) {
          await updateFile(file.id, { category: newName });
        }
      } else {
        await addFolder(folderNameInput.trim(), folderColorInput);
      }
      setShowFolderModal(false);
      setEditingFolder(null);
      setFolderNameInput("");
      setFolderColorInput("bg-blue-500");
    } catch (error) {
      console.error("Error saving folder:", error);
      alert("Error saving folder. Please try again.");
    }
  };

  const handleDeleteFolderClick = (folder: LibraryFolder) => {
    setFolderToDelete(folder);
    setShowDeleteFolderModal(true);
    setShowFolderMenu(null);
  };

  const handleConfirmDeleteFolder = async () => {
    if (folderToDelete) {
      try {
        await removeFolder(folderToDelete.id);
        if (selectedFolderId === folderToDelete.id) {
          setSelectedFolderId(null);
        }
        setShowDeleteFolderModal(false);
        setFolderToDelete(null);
      } catch (error) {
        console.error("Error deleting folder:", error);
        alert("Error deleting folder. Please try again.");
      }
    }
  };

  const handleMoveToFolder = async (fileId: string, folderId: string | null) => {
    try {
      await moveToFolder(fileId, folderId);

      // Update category to folder name (or "Uncategorized" if no folder)
      const folder = folderId ? folders.find(f => f.id === folderId) : null;
      const newCategory = folder ? folder.name : "Uncategorized";
      await updateFile(fileId, { category: newCategory });

      setShowMoveToFolderMenu(null);
      setShowMenu(null);
    } catch (error) {
      console.error("Error moving file:", error);
      alert("Error moving file. Please try again.");
    }
  };

  // Filter files based on search, filter, and folder
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || file.type === activeFilter;
    const matchesFolder = selectedFolderId === null ? !file.folderId : file.folderId === selectedFolderId;
    return matchesSearch && matchesFilter && matchesFolder;
  });

  const pinnedFiles = filteredFiles.filter((f) => f.isPinned);
  const unpinnedFiles = filteredFiles.filter((f) => !f.isPinned);

  const getFileIcon = (type: LibraryFile["type"]) => {
    switch (type) {
      case "pdf":
        return { icon: "picture_as_pdf", bg: "bg-red-50", hover: "group-hover:bg-red-100", text: "text-red-500" };
      case "image":
        return { icon: "image", bg: "bg-blue-50", hover: "group-hover:bg-blue-100", text: "text-blue-500" };
      case "audio":
        return { icon: "headphones", bg: "bg-amber-50", hover: "group-hover:bg-amber-100", text: "text-amber-500" };
      case "video":
        return { icon: "play_circle", bg: "bg-purple-50", hover: "group-hover:bg-purple-100", text: "text-purple-500" };
      default:
        return { icon: "description", bg: "bg-gray-50", hover: "group-hover:bg-gray-100", text: "text-gray-500" };
    }
  };

  const FileCard = ({ file }: { file: LibraryFile }) => {
    const iconData = getFileIcon(file.type);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleMouseLeave = () => {
      if (window.matchMedia("(pointer: fine)").matches) {
        setShowMenu(null);
        setShowMoveToFolderMenu(null);
      }
    };

    return (
      <>
        {showMenu === file.id && (
          <div
            className="fixed inset-0 z-10 lg:hidden"
            onClick={() => {
              setShowMenu(null);
              setShowMoveToFolderMenu(null);
            }}
          />
        )}

        <div
          className="group relative flex flex-col bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-500/30 transition-all hover:shadow-lg"
          onMouseLeave={handleMouseLeave}
        >
          {/* 3 dot menu */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(showMenu === file.id ? null : file.id);
                setShowMoveToFolderMenu(null);
              }}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            {showMenu === file.id && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(file);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin(file.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {file.isPinned ? "push_pin" : "keep"}
                  </span>
                  {file.isPinned ? "Unpin" : "Pin"}
                </button>
                {/* Move to folder */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoveToFolderMenu(showMoveToFolderMenu === file.id ? null : file.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">folder</span>
                    Move to folder
                    <span className="material-symbols-outlined text-[14px] ml-auto">chevron_right</span>
                  </button>
                  {showMoveToFolderMenu === file.id && (
                    <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToFolder(file.id, null);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${!file.folderId ? "text-indigo-600 font-medium" : "text-slate-700"}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">folder_off</span>
                        No folder
                      </button>
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToFolder(file.id, folder.id);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${file.folderId === folder.id ? "text-indigo-600 font-medium" : "text-slate-700"}`}
                        >
                          <span className={`size-4 rounded ${folder.color}`}></span>
                          {folder.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const a = document.createElement("a");
                    a.href = file.url;
                    a.download = file.name;
                    a.click();
                    setShowMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download
                </button>
                <hr className="my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(file);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Image/Icon area */}
          <div
            onClick={() => handlePreviewFile(file)}
            className={`flex items-center justify-center h-32 rounded-lg ${iconData.bg} ${iconData.hover} mb-4 transition-colors overflow-hidden cursor-pointer`}
          >
            {file.type === "image" ? (
              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
            ) : file.type === "pdf" ? (
              <PdfThumbnail url={file.url} className="w-full h-full" />
            ) : (
              <span className={`material-symbols-outlined text-4xl ${iconData.text}`}>{iconData.icon}</span>
            )}
          </div>

          {/* Info area */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                {file.category}
              </span>
              <span className="text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
            </div>
            <h4 className="text-slate-900 font-semibold text-sm leading-tight line-clamp-2">{file.name}</h4>
            <p className="text-slate-500 text-xs mt-1">{formatTimeAgo(file.uploadedAt)}</p>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,audio/*,video/*,.doc,.docx"
        onChange={(e) => handleFileUpload(e)}
        className="hidden"
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0]">
          <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#1e293b] tracking-tight">
                    <span className="sm:hidden">Library</span>
                    <span className="hidden sm:inline">Resource Library</span>
                  </h2>
                  <p className="text-[#64748b] text-xs sm:text-sm hidden sm:block">
                    Organize materials for your Polish lessons {mounted && `(${files.length} files)`}
                  </p>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mt-6 flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                  </div>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm"
                    placeholder="Search by name, grammar topic, or file type..."
                    type="text"
                  />
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`flex items-center gap-2 px-4 h-9 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      activeFilter === "all"
                        ? "bg-[#00132c] text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Resources
                  </button>
                  <button
                    onClick={() => setActiveFilter("pdf")}
                    className={`flex items-center gap-2 px-4 h-9 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      activeFilter === "pdf"
                        ? "bg-[#00132c] text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    Documents
                  </button>
                  <button
                    onClick={() => setActiveFilter("image")}
                    className={`flex items-center gap-2 px-4 h-9 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      activeFilter === "image"
                        ? "bg-[#00132c] text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">image</span>
                    Images
                  </button>
                  <button
                    onClick={() => setActiveFilter("audio")}
                    className={`flex items-center gap-2 px-4 h-9 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      activeFilter === "audio"
                        ? "bg-[#00132c] text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">headphones</span>
                    Audio
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 pb-10">
            {/* Quick Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">cloud_upload</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-slate-900 font-bold text-base">Quick Upload</h3>
                  <p className="text-slate-500 text-sm">Drag & drop files here to add to library</p>
                </div>
              </div>
              <span className="text-indigo-600 text-sm font-bold whitespace-nowrap group-hover:underline">Browse Files</span>
            </div>

            {/* Folders Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Folders</h3>
                <button
                  onClick={handleCreateFolder}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                  New Folder
                </button>
              </div>

              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {/* All Files "folder" */}
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 transition-all ${
                    selectedFolderId === null
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="size-9 sm:size-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-600 text-[20px] sm:text-[24px]">folder</span>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-sm truncate">All Files</p>
                    <p className="text-xs text-slate-500">{files.filter(f => !f.folderId).length} items</p>
                  </div>
                </button>

                {/* User folders */}
                {folders.map((folder) => {
                  const menuButtonId = `folder-menu-btn-${folder.id}`;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedFolderId === folder.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className={`size-9 sm:size-10 rounded-lg ${folder.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="material-symbols-outlined text-white text-[20px] sm:text-[24px]">folder</span>
                      </div>
                      <div className="text-left min-w-0 flex-1 overflow-hidden">
                        <p className="font-medium text-slate-900 text-sm truncate">{folder.name}</p>
                        <p className="text-xs text-slate-500">{files.filter(f => f.folderId === folder.id).length} items</p>
                      </div>
                      {/* Folder menu button */}
                      <button
                        id={menuButtonId}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id);
                        }}
                        className="size-7 sm:size-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span>
                      </button>
                    </div>
                  );
                })}

                {/* Folder menu dropdown - rendered outside of scroll container */}
                {showFolderMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFolderMenu(null)} />
                    <div
                      className="fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
                      style={{
                        top: (() => {
                          const btn = document.getElementById(`folder-menu-btn-${showFolderMenu}`);
                          if (btn) {
                            const rect = btn.getBoundingClientRect();
                            return rect.bottom + 4;
                          }
                          return 0;
                        })(),
                        left: (() => {
                          const btn = document.getElementById(`folder-menu-btn-${showFolderMenu}`);
                          if (btn) {
                            const rect = btn.getBoundingClientRect();
                            return rect.right - 160;
                          }
                          return 0;
                        })(),
                      }}
                    >
                      <button
                        onClick={() => {
                          const folder = folders.find(f => f.id === showFolderMenu);
                          if (folder) handleEditFolder(folder);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const folder = folders.find(f => f.id === showFolderMenu);
                          if (folder) handleDeleteFolderClick(folder);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section: Pinned Materials */}
            {pinnedFiles.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Pinned Materials</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pinnedFiles.map((file) => (
                    <FileCard key={file.id} file={file} />
                  ))}
                </div>
              </div>
            )}

            {/* Section: All Files */}
            {unpinnedFiles.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : "All Files"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unpinnedFiles.map((file) => (
                    <FileCard key={file.id} file={file} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-400">folder_open</span>
                </div>
                <h3 className="text-slate-900 font-semibold text-lg mb-1">No files found</h3>
                <p className="text-slate-500 text-sm">
                  {searchQuery || activeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : selectedFolderId
                    ? "This folder is empty. Upload files or move files here."
                    : "Upload your first file to get started"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Folder Modal */}
      {showFolderModal && (
        <div
          onClick={() => setShowFolderModal(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingFolder ? "Edit Folder" : "Create Folder"}
              </h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="e.g., Lesson 1, Grammar, Vocabulary..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFolderColorInput(color.value)}
                      className={`size-8 rounded-lg ${color.value} transition-transform ${
                        folderColorInput === color.value ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={!folderNameInput.trim()}
                  className="flex-1 h-10 bg-[#00132c] hover:bg-[#0f2545] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingFolder ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderModal && folderToDelete && (
        <div
          onClick={() => setShowDeleteFolderModal(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Delete Folder</h3>
              <button
                onClick={() => setShowDeleteFolderModal(false)}
                className="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-slate-700">
                Are you sure you want to delete <strong>{folderToDelete.name}</strong>? Files in this folder will be moved to &quot;All Files&quot;.
              </p>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowDeleteFolderModal(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteFolder}
                  className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFile && (
        <div
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit File</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter file name..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="e.g., Grammar, Vocabulary, Listening..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                  }}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 h-10 bg-[#00132c] hover:bg-[#0f2545] text-white font-medium rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fileToDelete && (
        <div
          onClick={() => setShowDeleteModal(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Delete File</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-slate-700">
                Are you sure you want to delete <strong>{fileToDelete.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedFile && (
        <div
          onClick={() => setShowPreview(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900">{selectedFile.name}</h3>
                <p className="text-sm text-slate-500">
                  {selectedFile.category} · {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedFile.type === "pdf" && (
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-3 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                    <span className="hidden sm:inline text-sm font-medium">Open in new tab</span>
                  </a>
                )}
                <button
                  onClick={() => setShowPreview(false)}
                  className="size-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              {selectedFile.type === "image" && (
                <img src={selectedFile.url} alt={selectedFile.name} className="w-full h-auto rounded-lg" />
              )}
              {selectedFile.type === "pdf" && (
                <PdfViewer url={selectedFile.url} className="h-[70vh] min-h-[400px]" />
              )}
              {selectedFile.type === "audio" && (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="size-24 rounded-full bg-amber-100 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-amber-500">headphones</span>
                  </div>
                  <audio controls src={selectedFile.url} className="w-full max-w-md">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              {selectedFile.type === "video" && (
                <video controls src={selectedFile.url} className="w-full rounded-lg">
                  Your browser does not support the video element.
                </video>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = selectedFile.url;
                  a.download = selectedFile.name;
                  a.click();
                }}
                className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                Download
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 h-10 bg-[#00132c] hover:bg-[#0f2545] text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
