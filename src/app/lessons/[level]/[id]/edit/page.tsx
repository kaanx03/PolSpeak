"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { fetchCurriculumTopics, fetchLessonContentById, createLessonContent, updateLessonContent, deleteLessonContent, uploadFile, deleteFile, getFilePathFromUrl } from "@/lib/supabase-helpers";
import { processFileForUpload, formatFileSize } from "@/lib/image-compression";

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface MatchingPair {
  left: string;
  right: string;
  rightImage?: string;
}

interface AudioItem {
  id: string;
  audioUrl: string;
  audioName: string;
  title: string;
}

interface ImageItem {
  id: string;
  imageUrl: string;
  imageName: string;
  caption: string;
}

interface Module {
  id: string;
  type: "fillblank" | "pdf" | "image" | "quiz" | "text" | "audio" | "matching" | "wordwall";
  content: {
    text?: string;
    sentence?: string;
    answers?: string[];
    question?: string;
    questionImageUrl?: string;
    questionImageName?: string;
    questionAudioUrl?: string;
    questionAudioName?: string;
    options?: QuizOption[];
    audioItems?: AudioItem[];
    imageItems?: ImageItem[];
    pdfUrl?: string;
    pdfName?: string;
    matchingType?: "word-definition" | "word-image";
    pairs?: MatchingPair[];
    wordwallUrl?: string;
    wordwallIframe?: string;
  };
}

// Library Files Panel Component
function LibraryFilesPanel() {
  const { files } = useLibrary();
  const [filter, setFilter] = useState<"all" | "pdf" | "image" | "audio">("all");

  const filteredFiles = files.filter((file) => {
    if (filter === "all") return true;
    return file.type === filter;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return { icon: "picture_as_pdf", color: "text-red-500" };
      case "image":
        return { icon: "image", color: "text-blue-500" };
      case "audio":
        return { icon: "headphones", color: "text-amber-500" };
      case "video":
        return { icon: "play_circle", color: "text-purple-500" };
      default:
        return { icon: "description", color: "text-gray-500" };
    }
  };

  const handleDragStart = (e: React.DragEvent, file: any) => {
    // Store file data for drag & drop
    e.dataTransfer.setData("library-file", JSON.stringify(file));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleTouchStart = (e: React.TouchEvent, file: any) => {
    // Store file data in a global for touch drag & drop
    (window as any).__touchDragFile = file;

    // Visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';

    // Clean up
    delete (window as any).__touchDragFile;
  };

  const handleFileClick = (file: any) => {
    // Open file in new tab/preview
    window.open(file.url, '_blank');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filter buttons */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-2 py-1 text-[10px] rounded ${
            filter === "all"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("pdf")}
          className={`px-2 py-1 text-[10px] rounded ${
            filter === "pdf"
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          PDF
        </button>
        <button
          onClick={() => setFilter("image")}
          className={`px-2 py-1 text-[10px] rounded ${
            filter === "image"
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Images
        </button>
        <button
          onClick={() => setFilter("audio")}
          className={`px-2 py-1 text-[10px] rounded ${
            filter === "audio"
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Audio
        </button>
      </div>

      {/* Files list */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {filteredFiles.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-4">
            No files in library
          </div>
        ) : (
          filteredFiles.map((file) => {
            const iconData = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onTouchStart={(e) => handleTouchStart(e, file)}
                onTouchEnd={handleTouchEnd}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all cursor-move group active:opacity-50"
                title={`Drag to add or click to preview: ${file.name}`}
              >
                <span className={`material-symbols-outlined text-[18px] ${iconData.color}`}>
                  {iconData.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500">{file.category}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileClick(file);
                  }}
                  className="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-indigo-600 hover:bg-indigo-100 rounded p-1"
                  title="Preview"
                >
                  open_in_new
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { addFiles } = useLibrary();
  const [lessonTitle, setLessonTitle] = useState("Untitled Lesson");
  const [modules, setModules] = useState<Module[]>([]);
  const [lessonStatus, setLessonStatus] = useState<"draft" | "published">("draft");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [curriculumTopicId, setCurriculumTopicId] = useState<string>("");
  const [curriculumTopics, setCurriculumTopics] = useState<any[]>([]);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [actualLessonId, setActualLessonId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load curriculum topics from Supabase
  useEffect(() => {
    loadCurriculumTopics();
  }, [params.level]);

  const loadCurriculumTopics = async () => {
    const allTopics = await fetchCurriculumTopics();
    // Filter topics by current level
    const levelTopics = allTopics.filter((t: any) => t.level === params.level);
    setCurriculumTopics(levelTopics);
  };

  // Load lesson from Supabase on mount
  useEffect(() => {
    loadLesson();
  }, [params.level, params.id]);

  const loadLesson = async () => {
    // Check if this is a new lesson
    if (params.id === 'new') {
      setIsNewLesson(true);
      setActualLessonId(null);
      return;
    }

    const lessonData = await fetchLessonContentById(params.id as string);
    if (lessonData) {
      setLessonTitle(lessonData.title);
      setModules(lessonData.modules || []);
      setLessonStatus(lessonData.status || "draft");
      setCurriculumTopicId(lessonData.curriculum_topic_id || "");
      setIsNewLesson(false);
      setActualLessonId(lessonData.id);
    } else {
      // Lesson not found, treat as new
      setIsNewLesson(true);
      setActualLessonId(null);
    }
  };


  // Validation function
  const validateModules = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (modules.length === 0) {
      errors.push("Please add at least one module to your lesson");
      return { isValid: false, errors };
    }

    modules.forEach((module, index) => {
      const moduleNum = index + 1;

      switch (module.type) {
        case "text":
          if (!module.content.text || module.content.text.trim() === "") {
            errors.push(`Module ${moduleNum} (Text): Content cannot be empty`);
          }
          break;

        case "fillblank":
          if (!module.content.sentence || module.content.sentence.trim() === "") {
            errors.push(`Module ${moduleNum} (Fill in the Blank): Sentence cannot be empty`);
          } else if (!module.content.sentence.includes("{") || !module.content.sentence.includes("}")) {
            errors.push(`Module ${moduleNum} (Fill in the Blank): Sentence must contain at least one blank using { }`);
          }
          if (!module.content.answers || module.content.answers.length === 0) {
            errors.push(`Module ${moduleNum} (Fill in the Blank): Please add at least one answer`);
          } else if (module.content.answers.some(a => !a || a.trim() === "")) {
            errors.push(`Module ${moduleNum} (Fill in the Blank): All answers must be filled in`);
          }
          break;

        case "quiz":
          if (!module.content.question || module.content.question.trim() === "") {
            errors.push(`Module ${moduleNum} (Quiz): Question cannot be empty`);
          }
          if (!module.content.options || module.content.options.length < 2) {
            errors.push(`Module ${moduleNum} (Quiz): Must have at least 2 options`);
          } else {
            if (module.content.options.some(opt => !opt.text || opt.text.trim() === "")) {
              errors.push(`Module ${moduleNum} (Quiz): All options must have text`);
            }
            if (!module.content.options.some(opt => opt.isCorrect)) {
              errors.push(`Module ${moduleNum} (Quiz): Must mark at least one correct answer`);
            }
          }
          break;

        case "matching":
          if (!module.content.pairs || module.content.pairs.length === 0) {
            errors.push(`Module ${moduleNum} (Matching): Please add at least one pair`);
          } else {
            module.content.pairs.forEach((pair, pairIndex) => {
              if (!pair.left || pair.left.trim() === "") {
                errors.push(`Module ${moduleNum} (Matching): Pair ${pairIndex + 1} - Left side cannot be empty`);
              }
              if (module.content.matchingType === "word-definition") {
                if (!pair.right || pair.right.trim() === "") {
                  errors.push(`Module ${moduleNum} (Matching): Pair ${pairIndex + 1} - Right side cannot be empty`);
                }
              } else if (module.content.matchingType === "word-image") {
                if (!pair.rightImage || pair.rightImage.trim() === "") {
                  errors.push(`Module ${moduleNum} (Matching): Pair ${pairIndex + 1} - Image is required`);
                }
              }
            });
          }
          break;

        case "image":
          if (!module.content.imageItems || module.content.imageItems.length === 0) {
            errors.push(`Module ${moduleNum} (Image): Please add at least one image`);
          } else {
            module.content.imageItems.forEach((item: ImageItem, itemIndex: number) => {
              if (!item.imageUrl || item.imageUrl.trim() === "") {
                errors.push(`Module ${moduleNum} (Image): Image ${itemIndex + 1} - Please upload an image`);
              }
              if (!item.caption || item.caption.trim() === "") {
                errors.push(`Module ${moduleNum} (Image): Image ${itemIndex + 1} - Caption is required`);
              }
            });
          }
          break;

        case "pdf":
          if (!module.content.pdfUrl || module.content.pdfUrl.trim() === "") {
            errors.push(`Module ${moduleNum} (PDF): Please upload a PDF file`);
          }
          break;

        case "audio":
          if (!module.content.audioItems || module.content.audioItems.length === 0) {
            errors.push(`Module ${moduleNum} (Audio): Please add at least one audio item`);
          } else {
            module.content.audioItems.forEach((item: AudioItem, itemIndex: number) => {
              if (!item.audioUrl || item.audioUrl.trim() === "") {
                errors.push(`Module ${moduleNum} (Audio): Audio ${itemIndex + 1} - Please upload an audio file`);
              }
              if (!item.title || item.title.trim() === "") {
                errors.push(`Module ${moduleNum} (Audio): Audio ${itemIndex + 1} - Title is required`);
              }
            });
          }
          break;

        case "wordwall":
          if ((!module.content.wordwallUrl || module.content.wordwallUrl.trim() === "") &&
              (!module.content.wordwallIframe || module.content.wordwallIframe.trim() === "")) {
            errors.push(`Module ${moduleNum} (Wordwall): Please add either a Wordwall URL or iframe code`);
          }
          break;
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  // Save to Supabase
  const saveDraft = async () => {
    const validation = validateModules();
    if (!validation.isValid) {
      showToast(validation.errors[0], "error");
      // Show additional errors if there are multiple
      if (validation.errors.length > 1) {
        setTimeout(() => {
          showToast(`${validation.errors.length - 1} more validation error(s)`, "warning");
        }, 500);
      }
      return;
    }

    try {
      const lessonData = {
        title: lessonTitle,
        modules: modules,
        level: params.level as any,
        status: lessonStatus,
        curriculum_topic_id: curriculumTopicId || undefined,
      };

      if (isNewLesson) {
        // Create new lesson
        const created = await createLessonContent(lessonData);
        setActualLessonId(created.id);
        setIsNewLesson(false);
        // Redirect to edit page with new ID
        router.push(`/lessons/${params.level}/${created.id}/edit`);
        showToast("Draft created successfully!", "success");
      } else {
        // Update existing lesson
        await updateLessonContent(params.id as string, lessonData);
        showToast(lessonStatus === "published" ? "Changes saved successfully!" : "Draft saved successfully!", "success");
      }
    } catch (error: any) {
      showToast("Failed to save: " + error.message, "error");
    }
  };

  const publishLesson = async () => {
    const validation = validateModules();
    if (!validation.isValid) {
      showToast(validation.errors[0], "error");
      // Show additional errors if there are multiple
      if (validation.errors.length > 1) {
        setTimeout(() => {
          showToast(`${validation.errors.length - 1} more validation error(s)`, "warning");
        }, 500);
      }
      return;
    }

    try {
      const lessonData = {
        title: lessonTitle,
        modules: modules,
        level: params.level as any,
        status: "published" as const,
        curriculum_topic_id: curriculumTopicId || undefined,
      };

      if (isNewLesson) {
        // Create new lesson as published
        const created = await createLessonContent(lessonData);
        router.push(`/lessons/${params.level}/${created.id}/edit`);
        setLessonStatus("published");
        showToast("Lesson published successfully!", "success");
      } else {
        // Update existing lesson to published
        await updateLessonContent(params.id as string, lessonData);
        setLessonStatus("published");
        showToast("Lesson published successfully!", "success");
      }
    } catch (error: any) {
      showToast("Failed to publish: " + error.message, "error");
    }
  };

  const deleteLesson = async () => {
    try {
      if (!isNewLesson) {
        await deleteLessonContent(params.id as string, params.level as string);
      }
      showToast("Lesson and all associated files deleted successfully", "success");
      setShowDeleteModal(false);
      setTimeout(() => {
        router.push(`/lessons/${params.level}`);
      }, 1000);
    } catch (error: any) {
      showToast("Failed to delete: " + error.message, "error");
      setShowDeleteModal(false);
    }
  };

  const moduleTypes = [
    {
      type: "text",
      icon: "text_fields",
      label: "Text Content",
      color: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    },
    {
      type: "fillblank",
      icon: "edit_note",
      label: "Fill in the Blank",
      color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700",
    },
    {
      type: "quiz",
      icon: "quiz",
      label: "Multiple Choice Quiz",
      color: "bg-purple-100 hover:bg-purple-200 text-purple-700",
    },
    {
      type: "matching",
      icon: "swap_horiz",
      label: "Matching Exercise",
      color: "bg-teal-100 hover:bg-teal-200 text-teal-700",
    },
    {
      type: "audio",
      icon: "volume_up",
      label: "Audio",
      color: "bg-green-100 hover:bg-green-200 text-green-700",
    },
    {
      type: "image",
      icon: "image",
      label: "Image",
      color: "bg-blue-100 hover:bg-blue-200 text-blue-700",
    },
    {
      type: "pdf",
      icon: "picture_as_pdf",
      label: "PDF Document",
      color: "bg-red-100 hover:bg-red-200 text-red-700",
    },
    {
      type: "wordwall",
      icon: "extension",
      label: "Wordwall Activity",
      color: "bg-orange-100 hover:bg-orange-200 text-orange-700",
    },
  ];

  const addModule = (type: string) => {
    const newModule: Module = {
      id: Date.now().toString(),
      type: type as any,
      content: type === "quiz"
        ? { options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }
        : type === "matching"
        ? { matchingType: "word-definition", pairs: [{ left: "", right: "" }] }
        : type === "audio"
        ? { audioItems: [] }
        : type === "image"
        ? { imageItems: [] }
        : {},
    };
    setModules([...modules, newModule]);
  };

  // Add module from library file (drag & drop)
  const addModuleFromLibrary = (file: any) => {
    let newModule: Module | null = null;

    if (file.type === "pdf") {
      newModule = {
        id: Date.now().toString(),
        type: "pdf",
        content: {
          pdfUrl: file.url,
          pdfName: file.name,
        },
      };
    } else if (file.type === "image") {
      newModule = {
        id: Date.now().toString(),
        type: "image",
        content: {
          imageItems: [{
            id: Date.now().toString(),
            imageUrl: file.url,
            imageName: file.name,
            caption: file.name,
          }],
        },
      };
    } else if (file.type === "audio") {
      newModule = {
        id: Date.now().toString(),
        type: "audio",
        content: {
          audioItems: [{
            id: Date.now().toString(),
            audioUrl: file.url,
            audioName: file.name,
            title: file.name,
          }],
        },
      };
    }

    if (newModule) {
      setModules([...modules, newModule]);
      showToast(`Added ${file.name} to lesson`, "success");
    }
  };

  const deleteModule = (id: string) => {
    setModules(modules.filter((m) => m.id !== id));
  };

  const moveModule = (index: number, direction: "up" | "down") => {
    const newModules = [...modules];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < modules.length) {
      [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
      setModules(newModules);
    }
  };

  const updateModuleContent = (id: string, content: any) => {
    setModules(modules.map(m => m.id === id ? { ...m, content: { ...m.content, ...content } } : m));
  };

  // Quiz functions
  const addQuizOption = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.options) {
      updateModuleContent(moduleId, {
        options: [...module.content.options, { text: "", isCorrect: false }]
      });
    }
  };

  const removeQuizOption = (moduleId: string, index: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.options && module.content.options.length > 2) {
      const newOptions = module.content.options.filter((_, i) => i !== index);
      updateModuleContent(moduleId, { options: newOptions });
    }
  };

  const updateQuizOption = (moduleId: string, index: number, text: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.options) {
      const newOptions = [...module.content.options];
      newOptions[index].text = text;
      updateModuleContent(moduleId, { options: newOptions });
    }
  };

  const setCorrectAnswer = (moduleId: string, index: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.options) {
      const newOptions = module.content.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index
      }));
      updateModuleContent(moduleId, { options: newOptions });
    }
  };

  // Matching functions
  const addMatchingPair = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.pairs) {
      updateModuleContent(moduleId, {
        pairs: [...module.content.pairs, { left: "", right: "" }]
      });
    }
  };

  const removeMatchingPair = (moduleId: string, index: number) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.pairs && module.content.pairs.length > 1) {
      const newPairs = module.content.pairs.filter((_, i) => i !== index);
      updateModuleContent(moduleId, { pairs: newPairs });
    }
  };

  const updateMatchingPair = (moduleId: string, index: number, field: "left" | "right", value: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.pairs) {
      const newPairs = [...module.content.pairs];
      newPairs[index][field] = value;
      updateModuleContent(moduleId, { pairs: newPairs });
    }
  };

  // File upload handlers - Upload to Supabase Storage
  const handleFileUpload = async (moduleId: string, type: "image" | "pdf" | "audio", file: File) => {
    try {
      // Get lesson ID
      const lessonId = actualLessonId || params.id as string;

      // Process file (compress images, validate size)
      const { processedFile, originalSize, compressedSize, compressionRatio, valid, message } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Show compression info for images
      if (type === "image" && compressionRatio > 0) {
        console.log(`Image compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio.toFixed(0)}% reduction)`);
      }

      // Upload to Supabase Storage
      const { url, name } = await uploadFile(processedFile, `lessons/${params.level}/${lessonId}`);

      if (type === "image") {
        updateModuleContent(moduleId, {
          imageUrl: url,
          imageName: name
        });
      } else if (type === "pdf") {
        updateModuleContent(moduleId, {
          pdfUrl: url,
          pdfName: name
        });
      } else if (type === "audio") {
        updateModuleContent(moduleId, {
          audioUrl: url,
          audioName: name
        });
      }

      showToast("Uploaded successfully!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  const handleMatchingImageUpload = async (moduleId: string, pairIndex: number, file: File) => {
    try {
      const lessonId = actualLessonId || params.id as string;

      // Process file (compress images, validate size)
      const { processedFile, valid, message } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Upload to Supabase Storage
      const { url } = await uploadFile(processedFile, `lessons/${params.level}/${lessonId}`);

      const module = modules.find(m => m.id === moduleId);
      if (module && module.content.pairs) {
        const newPairs = [...module.content.pairs];
        newPairs[pairIndex].rightImage = url;
        updateModuleContent(moduleId, { pairs: newPairs });
      }

      showToast("Uploaded successfully!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  // Audio Item functions
  const addAudioItem = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      const audioItems = module.content.audioItems || [];
      updateModuleContent(moduleId, {
        audioItems: [...audioItems, { id: Date.now().toString(), audioUrl: "", audioName: "", title: "" }]
      });
    }
  };

  const removeAudioItem = (moduleId: string, itemId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.audioItems) {
      const newItems = module.content.audioItems.filter(item => item.id !== itemId);
      updateModuleContent(moduleId, { audioItems: newItems });
    }
  };

  const updateAudioItemTitle = (moduleId: string, itemId: string, title: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.audioItems) {
      const newItems = module.content.audioItems.map(item =>
        item.id === itemId ? { ...item, title } : item
      );
      updateModuleContent(moduleId, { audioItems: newItems });
    }
  };

  const handleAudioItemUpload = async (moduleId: string, itemId: string, file: File) => {
    try {
      const lessonId = actualLessonId || params.id as string;

      // Process file (validate size for audio)
      const { processedFile, valid, message } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Upload to Supabase Storage
      const { url, name } = await uploadFile(processedFile, `lessons/${params.level}/${lessonId}`);

      const module = modules.find(m => m.id === moduleId);
      if (module && module.content.audioItems) {
        const newItems = module.content.audioItems.map(item =>
          item.id === itemId ? { ...item, audioUrl: url, audioName: name } : item
        );
        updateModuleContent(moduleId, { audioItems: newItems });
      }

      showToast("Uploaded successfully!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  // Image Item functions
  const addImageItem = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      const imageItems = module.content.imageItems || [];
      updateModuleContent(moduleId, {
        imageItems: [...imageItems, { id: Date.now().toString(), imageUrl: "", imageName: "", caption: "" }]
      });
    }
  };

  const removeImageItem = (moduleId: string, itemId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.imageItems) {
      const newItems = module.content.imageItems.filter(item => item.id !== itemId);
      updateModuleContent(moduleId, { imageItems: newItems });
    }
  };

  const updateImageItemCaption = (moduleId: string, itemId: string, caption: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module && module.content.imageItems) {
      const newItems = module.content.imageItems.map(item =>
        item.id === itemId ? { ...item, caption } : item
      );
      updateModuleContent(moduleId, { imageItems: newItems });
    }
  };

  const handleImageItemUpload = async (moduleId: string, itemId: string, file: File) => {
    try {
      const lessonId = actualLessonId || params.id as string;

      // Process file (compress images, validate size)
      const { processedFile, valid, message } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Upload to Supabase Storage
      const { url, name } = await uploadFile(processedFile, `lessons/${params.level}/${lessonId}`);

      const module = modules.find(m => m.id === moduleId);
      if (module && module.content.imageItems) {
        const newItems = module.content.imageItems.map(item =>
          item.id === itemId ? { ...item, imageUrl: url, imageName: name } : item
        );
        updateModuleContent(moduleId, { imageItems: newItems });
      }

      showToast("Uploaded successfully!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar hideHamburger />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 pb-16 md:pb-20 xl:pb-0">
        {/* Top Bar */}
        <div className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <Link
                href={`/lessons/${params.level}`}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </Link>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="text-base md:text-xl font-bold text-[#1e293b] bg-transparent border-none focus:outline-none focus:ring-0 p-0 min-w-0 flex-1"
                placeholder="Lesson Title"
              />
            </div>
            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>

              {/* Desktop Buttons */}
              <button
                onClick={saveDraft}
                className="hidden md:block px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                {lessonStatus === "published" ? "Save" : "Save Draft"}
              </button>
              {lessonStatus === "draft" && (
                <button
                  onClick={publishLesson}
                  className="hidden md:block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Publish
                </button>
              )}
              {lessonStatus === "published" && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md border border-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-500"></span>
                  Published
                </span>
              )}

              {/* Mobile: Save Icon Button */}
              <button
                onClick={saveDraft}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                title={lessonStatus === "published" ? "Save" : "Save Draft"}
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
              </button>

              {/* Mobile: Publish Icon Button (only for drafts) */}
              {lessonStatus === "draft" && (
                <button
                  onClick={publishLesson}
                  className="md:hidden p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  title="Publish"
                >
                  <span className="material-symbols-outlined text-[20px]">publish</span>
                </button>
              )}

              {/* Mobile: Published indicator */}
              {lessonStatus === "published" && (
                <span className="md:hidden size-2 rounded-full bg-emerald-500" title="Published"></span>
              )}

              <Link
                href={`/lessons/${params.level}/${params.id}/present`}
                className="inline-flex items-center gap-2 px-2 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">present_to_all</span>
                <span className="hidden md:inline">Present Mode</span>
              </Link>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-slate-200 space-y-2">
              <div className="text-xs text-slate-600 space-y-1 pb-2">
                <p>Modules: {modules.length}</p>
                <p>Level: {(params.level as string)?.toUpperCase()}</p>
              </div>
              <button
                onClick={() => {
                  deleteLesson();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200"
              >
                Delete Lesson
              </button>
            </div>
          )}
        </div>

        {/* Mobile Module Icons Bar - Only visible on mobile */}
        <div className="md:hidden bg-white border-b border-[#e2e8f0] px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {moduleTypes.map((module) => (
              <button
                key={module.type}
                onClick={() => addModule(module.type)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg ${module.color} transition-all`}
                title={module.label}
              >
                <span className="material-symbols-outlined text-[22px]">{module.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Module Library - Hidden on mobile */}
          <div className="hidden md:block w-64 bg-white border-r border-[#e2e8f0] p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-[#1e293b] mb-4 uppercase tracking-wider">
              Add Modules
            </h3>
            <div className="flex flex-col gap-2">
              {moduleTypes.map((module) => (
                <button
                  key={module.type}
                  onClick={() => addModule(module.type)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${module.color} text-sm font-medium transition-colors text-left`}
                >
                  <span className="material-symbols-outlined text-[20px]">{module.icon}</span>
                  <span>{module.label}</span>
                </button>
              ))}
            </div>

            {/* Library Files Section */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>Library Files</span>
                <Link
                  href="/library"
                  className="text-indigo-600 hover:text-indigo-700 normal-case text-xs font-medium"
                  title="Open Library"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </Link>
              </h4>
              <LibraryFilesPanel />
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                Curriculum Topic
              </h4>
              <select
                value={curriculumTopicId}
                onChange={(e) => setCurriculumTopicId(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer mb-4"
                style={{ fontSize: '12px' }}
              >
                <option value="" style={{ fontSize: '12px' }}>No topic assigned</option>
                {curriculumTopics.map((topic) => (
                  <option key={topic.id} value={topic.id} style={{ fontSize: '12px' }}>
                    {topic.category} - {topic.title}
                  </option>
                ))}
              </select>

              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                Lesson Info
              </h4>
              <div className="text-xs text-slate-600 space-y-2">
                <p>Modules: {modules.length}</p>
                <p>Level: {(params.level as string)?.toUpperCase()}</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-4 w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200"
                title="Delete this lesson"
              >
                Delete Lesson
              </button>
            </div>
          </div>

          {/* Right Panel - Canvas */}
          <div
            className="flex-1 overflow-y-auto p-3 md:p-6"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fileData = e.dataTransfer.getData("library-file");
              if (fileData) {
                try {
                  const file = JSON.parse(fileData);
                  addModuleFromLibrary(file);
                } catch (err) {
                  console.error("Failed to parse dropped file:", err);
                }
              }
            }}
            onTouchMove={(e) => {
              // Allow touch drag - prevent default scroll behavior when dragging
              if ((window as any).__touchDragFile) {
                e.preventDefault();
              }
            }}
            onTouchEnd={(e) => {
              // Handle touch drop
              const file = (window as any).__touchDragFile;
              if (file) {
                addModuleFromLibrary(file);
                delete (window as any).__touchDragFile;
              }
            }}
          >
            <div className="max-w-4xl mx-auto">
              {modules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                  <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      add_circle
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1e293b] mb-2">Start Building Your Lesson</h3>
                  <p className="text-slate-500 text-sm mb-1">
                    Click on modules from the left panel to add them
                  </p>
                  <p className="text-slate-500 text-sm">
                    Or drag & drop files from Library Files
                  </p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {modules.map((module, index) => (
                    <div
                      key={module.id}
                      className="bg-white rounded-lg md:rounded-xl border-2 border-slate-200 hover:border-indigo-300 p-3 md:p-6 group transition-all"
                    >
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-slate-400 text-[20px] md:text-[24px] flex-shrink-0">
                            {moduleTypes.find((t) => t.type === module.type)?.icon}
                          </span>
                          <span className="font-medium text-slate-700 text-sm md:text-base truncate">
                            {moduleTypes.find((t) => t.type === module.type)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 md:gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => moveModule(index, "up")}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[16px] md:text-[18px]">
                              arrow_upward
                            </span>
                          </button>
                          <button
                            onClick={() => moveModule(index, "down")}
                            disabled={index === modules.length - 1}
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[16px] md:text-[18px]">
                              arrow_downward
                            </span>
                          </button>
                          <button
                            onClick={() => deleteModule(module.id)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded"
                          >
                            <span className="material-symbols-outlined text-[16px] md:text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Module Content Editor */}
                      <div className="bg-slate-50 rounded-lg p-3 md:p-4 min-h-[100px]">
                        {/* TEXT MODULE */}
                        {module.type === "text" && (
                          <textarea
                            value={module.content.text || ""}
                            onChange={(e) => updateModuleContent(module.id, { text: e.target.value })}
                            className="w-full min-h-[100px] bg-white rounded border border-slate-200 p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Enter your text content here..."
                          />
                        )}

                        {/* FILL IN THE BLANK MODULE */}
                        {module.type === "fillblank" && (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={module.content.sentence || ""}
                              onChange={(e) => updateModuleContent(module.id, { sentence: e.target.value })}
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Enter sentence with {blank} markers for fill-in-the-blank..."
                            />
                            <input
                              type="text"
                              value={module.content.answers?.join(", ") || ""}
                              onChange={(e) => updateModuleContent(module.id, { answers: e.target.value.split(",").map(s => s.trim()) })}
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Correct answers (comma separated)"
                            />
                          </div>
                        )}

                        {/* QUIZ MODULE */}
                        {module.type === "quiz" && (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={module.content.question || ""}
                              onChange={(e) => updateModuleContent(module.id, { question: e.target.value })}
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Quiz question..."
                            />

                            {/* Question Image */}
                            <div className="flex gap-2">
                              {module.content.questionImageUrl ? (
                                <div className="relative w-40 h-24 border-2 border-purple-200 rounded overflow-hidden group">
                                  <img src={module.content.questionImageUrl} alt="Question" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => updateModuleContent(module.id, { questionImageUrl: undefined, questionImageName: undefined })}
                                    className="absolute top-1 right-1 px-2 py-0.5 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium rounded transition-all"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center w-40 h-24 border-2 border-dashed border-purple-300 rounded bg-white cursor-pointer hover:bg-purple-50/50">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const lessonId = actualLessonId || params.id as string;
                                          const { url, name } = await uploadFile(file, `lessons/${params.level}/${lessonId}`);
                                          updateModuleContent(module.id, {
                                            questionImageUrl: url,
                                            questionImageName: name
                                          });
                                          showToast("Uploaded successfully!", "success");
                                        } catch (error: any) {
                                          showToast("Upload failed: " + error.message, "error");
                                        } finally {
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className="text-center">
                                    <span className="material-symbols-outlined text-xl text-purple-400">image</span>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Add image</p>
                                  </div>
                                </label>
                              )}

                              {/* Question Audio */}
                              {module.content.questionAudioUrl ? (
                                <div className="flex-1 bg-purple-50 border-2 border-purple-200 rounded p-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-purple-700 font-medium">{module.content.questionAudioName}</span>
                                    <button
                                      onClick={() => updateModuleContent(module.id, { questionAudioUrl: undefined, questionAudioName: undefined })}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                  <audio controls className="w-full h-7">
                                    <source src={module.content.questionAudioUrl} />
                                  </audio>
                                </div>
                              ) : (
                                <label className="flex-1 flex items-center justify-center h-24 border-2 border-dashed border-purple-300 rounded bg-white cursor-pointer hover:bg-purple-50/50">
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const lessonId = actualLessonId || params.id as string;
                                          const { url, name } = await uploadFile(file, `lessons/${params.level}/${lessonId}`);
                                          updateModuleContent(module.id, {
                                            questionAudioUrl: url,
                                            questionAudioName: name
                                          });
                                          showToast("Uploaded successfully!", "success");
                                        } catch (error: any) {
                                          showToast("Upload failed: " + error.message, "error");
                                        } finally {
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <div className="text-center">
                                    <span className="material-symbols-outlined text-xl text-purple-400">volume_up</span>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Add audio</p>
                                  </div>
                                </label>
                              )}
                            </div>

                            <div className="space-y-2">
                              {module.content.options?.map((option, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`quiz-${module.id}`}
                                    checked={option.isCorrect}
                                    onChange={() => setCorrectAnswer(module.id, i)}
                                    className="cursor-pointer"
                                    title="Mark as correct answer"
                                  />
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) => updateQuizOption(module.id, i, e.target.value)}
                                    className="flex-1 bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder={`Option ${i + 1}`}
                                  />
                                  {module.content.options && module.content.options.length > 2 && (
                                    <button
                                      onClick={() => removeQuizOption(module.id, i)}
                                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addQuizOption(module.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              + Add option
                            </button>
                          </div>
                        )}

                        {/* MATCHING MODULE */}
                        {module.type === "matching" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <label className="text-sm font-medium text-slate-700">Matching Type:</label>
                              <select
                                value={module.content.matchingType || "word-definition"}
                                onChange={(e) => updateModuleContent(module.id, { matchingType: e.target.value })}
                                className="px-3 py-1 bg-white rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="word-definition">Word - Definition</option>
                                <option value="word-image">Word - Image</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              {module.content.pairs?.map((pair, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={pair.left}
                                    onChange={(e) => updateMatchingPair(module.id, i, "left", e.target.value)}
                                    className="flex-1 bg-white rounded border border-slate-200 px-2 md:px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-0"
                                    placeholder="Left"
                                  />
                                  <span className="material-symbols-outlined text-slate-400 text-sm md:text-base">swap_horiz</span>
                                  {module.content.matchingType === "word-image" ? (
                                    <div className="flex-1 relative min-w-0">
                                      {pair.rightImage ? (
                                        <div className="relative h-16 md:h-20 w-full border-2 border-slate-200 rounded overflow-hidden group">
                                          <img src={pair.rightImage} alt="Match" className="w-full h-full object-cover" />
                                          <button
                                            onClick={() => {
                                              const newPairs = [...(module.content.pairs || [])];
                                              delete newPairs[i].rightImage;
                                              updateModuleContent(module.id, { pairs: newPairs });
                                            }}
                                            className="absolute top-1 right-1 md:top-2 md:right-2 px-1.5 md:px-2 py-0.5 bg-black/60 hover:bg-black/80 text-white text-[9px] md:text-[10px] font-medium rounded transition-all"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="flex items-center justify-center h-16 md:h-20 border-2 border-dashed border-slate-300 rounded bg-white cursor-pointer hover:bg-slate-50">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleMatchingImageUpload(module.id, i, file);
                                            }}
                                            className="hidden"
                                          />
                                          <div className="text-center">
                                            <span className="material-symbols-outlined text-lg md:text-2xl text-slate-400">image</span>
                                            <p className="text-[9px] md:text-xs text-slate-500 mt-0.5 md:mt-1">Upload</p>
                                          </div>
                                        </label>
                                      )}
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={pair.right}
                                      onChange={(e) => updateMatchingPair(module.id, i, "right", e.target.value)}
                                      className="flex-1 bg-white rounded border border-slate-200 px-2 md:px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-0"
                                      placeholder="Right"
                                    />
                                  )}
                                  {module.content.pairs && module.content.pairs.length > 1 && (
                                    <button
                                      onClick={() => removeMatchingPair(module.id, i)}
                                      className="p-1 hover:bg-red-50 text-red-600 rounded flex-shrink-0"
                                    >
                                      <span className="material-symbols-outlined text-[16px] md:text-[18px]">close</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => addMatchingPair(module.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              + Add pair
                            </button>
                          </div>
                        )}

                        {/* AUDIO MODULE */}
                        {module.type === "audio" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-slate-600 font-medium">Audio Items</p>
                              <button
                                onClick={() => addAudioItem(module.id)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Add Audio
                              </button>
                            </div>

                            {(!module.content.audioItems || module.content.audioItems.length === 0) && (
                              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">volume_up</span>
                                <p className="text-sm text-slate-400">No audio items yet. Click "Add Audio" to start.</p>
                              </div>
                            )}

                            <div className="space-y-3">
                              {module.content.audioItems?.map((item, index) => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border-2 border-green-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-semibold text-green-700">Audio {index + 1}</span>
                                    <button
                                      onClick={() => removeAudioItem(module.id, item.id)}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => updateAudioItemTitle(module.id, item.id, e.target.value)}
                                    className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Title (e.g., Cześć, Dzień dobry)"
                                  />

                                  {item.audioUrl ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                                        <span className="text-xs text-slate-600">{item.audioName}</span>
                                      </div>
                                      <audio controls className="w-full h-8">
                                        <source src={item.audioUrl} />
                                      </audio>
                                      <label className="inline-block">
                                        <input
                                          type="file"
                                          accept="audio/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleAudioItemUpload(module.id, item.id, file);
                                          }}
                                          className="hidden"
                                        />
                                        <span className="text-xs text-green-600 hover:text-green-700 cursor-pointer underline">
                                          Change audio
                                        </span>
                                      </label>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-50/50">
                                      <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleAudioItemUpload(module.id, item.id, file);
                                        }}
                                        className="hidden"
                                      />
                                      <span className="material-symbols-outlined text-2xl text-green-400 mb-1">volume_up</span>
                                      <p className="text-xs text-slate-500">Upload audio file</p>
                                    </label>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* IMAGE MODULE */}
                        {module.type === "image" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-slate-600 font-medium">Image Items</p>
                              <button
                                onClick={() => addImageItem(module.id)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Add Image
                              </button>
                            </div>

                            {(!module.content.imageItems || module.content.imageItems.length === 0) && (
                              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">image</span>
                                <p className="text-sm text-slate-400">No images yet. Click "Add Image" to start.</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {module.content.imageItems?.map((item, index) => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border-2 border-blue-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-semibold text-blue-700">Image {index + 1}</span>
                                    <button
                                      onClick={() => removeImageItem(module.id, item.id)}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>

                                  {item.imageUrl ? (
                                    <div className="space-y-2">
                                      <div className="relative group">
                                        <img src={item.imageUrl} alt={item.caption || "Image"} className="w-full rounded-lg" />
                                        <label className="absolute inset-0 bg-black/50 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleImageItemUpload(module.id, item.id, file);
                                            }}
                                            className="hidden"
                                          />
                                          <span className="text-white text-xs font-medium">Change Image</span>
                                        </label>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50/50 mb-2">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleImageItemUpload(module.id, item.id, file);
                                        }}
                                        className="hidden"
                                      />
                                      <span className="material-symbols-outlined text-2xl text-blue-400 mb-1">image</span>
                                      <p className="text-xs text-slate-500">Upload image</p>
                                    </label>
                                  )}

                                  <input
                                    type="text"
                                    value={item.caption}
                                    onChange={(e) => updateImageItemCaption(module.id, item.id, e.target.value)}
                                    className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Caption (e.g., Kot, Pies)"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PDF MODULE */}
                        {module.type === "pdf" && (
                          <>
                            {module.content.pdfUrl ? (
                              <div className="bg-white p-4 rounded border-2 border-red-300">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-red-600">picture_as_pdf</span>
                                  <span className="text-sm font-medium">{module.content.pdfName}</span>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-pointer hover:bg-slate-50">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(module.id, "pdf", file);
                                  }}
                                  className="hidden"
                                />
                                <span className="material-symbols-outlined text-3xl text-red-400 mb-2">
                                  picture_as_pdf
                                </span>
                                <p className="text-sm text-slate-500">Click to upload PDF</p>
                              </label>
                            )}
                          </>
                        )}

                        {/* WORDWALL MODULE */}
                        {module.type === "wordwall" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Wordwall Link:</label>
                              <input
                                type="text"
                                value={module.content.wordwallUrl || ""}
                                onChange={(e) => updateModuleContent(module.id, { wordwallUrl: e.target.value })}
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="https://wordwall.net/resource/1910171"
                              />
                              <p className="text-xs text-slate-500">Paste the Wordwall activity link (works automatically)</p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Or paste iframe code (recommended):</label>
                              <textarea
                                value={module.content.wordwallIframe || ""}
                                onChange={(e) => updateModuleContent(module.id, { wordwallIframe: e.target.value })}
                                className="w-full min-h-[80px] bg-white rounded border border-slate-200 px-3 py-2 text-xs font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder='<iframe style="max-width:100%" src="https://wordwall.net/embed/..." width="500" height="380" frameborder="0"></iframe>'
                              />
                              <p className="text-xs text-slate-500">Iframe code includes all settings and works best</p>
                            </div>
                            {(module.content.wordwallUrl || module.content.wordwallIframe) && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">✓ Wordwall activity configured</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Lesson?</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong className="font-semibold">Warning:</strong> This will permanently delete:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  The lesson "{lessonTitle}"
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  All {modules.length} module{modules.length !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  All associated files (images, PDFs, audio)
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteLesson}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
