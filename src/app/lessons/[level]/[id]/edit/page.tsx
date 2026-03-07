"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useLibrary } from "@/contexts/LibraryContext";
import {
  fetchCurriculumTopics,
  fetchLessonContentById,
  createLessonContent,
  updateLessonContent,
  deleteLessonContent,
  uploadFile,
  deleteFile,
  getFilePathFromUrl,
  fetchStudents,
  fetchStudentsForSharedLesson,
  shareLesson,
  unshareLesson,
  type Student,
} from "@/lib/supabase-helpers";
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
  orientation?: "landscape" | "portrait"; // Yatay veya dik görsel
}

interface TrueFalseStatement {
  id: string;
  statement: string;
  isTrue: boolean;
}

interface ImageChoiceItem {
  id: string;
  imageUrl: string;
  imageName: string;
  correctOption: string;
  options: string[];
}

interface InlineChoiceSentence {
  id: string;
  text: string; // Text with {0}, {1}, etc. placeholders for dropdowns
  blanks: {
    correctAnswer: string;
    options: string[];
  }[];
}

interface Module {
  id: string;
  type:
    | "fillblank"
    | "pdf"
    | "image"
    | "quiz"
    | "text"
    | "audio"
    | "matching"
    | "wordwall"
    | "miro"
    | "quizlet"
    | "genially"
    | "baamboozle"
    | "truefalse"
    | "imagechoice"
    | "inlinechoice"
    | "youtube"
    | "vocabulary";
  content: {
    text?: string;
    textBgColor?: string; // Background color for text module
    sentence?: string;
    answers?: string[];
    question?: string;
    questionImageUrl?: string;
    questionImageName?: string;
    questionAudioUrl?: string;
    questionAudioName?: string;
    options?: QuizOption[];
    audioItems?: AudioItem[];
    audioPlayMode?: "controls" | "click"; // controls = full player, click = click to play
    imageItems?: ImageItem[];
    pdfUrl?: string;
    pdfName?: string;
    matchingType?: "word-definition" | "word-image";
    pairs?: MatchingPair[];
    wordwallUrl?: string;
    wordwallIframe?: string;
    miroUrl?: string;
    quizletUrl?: string;
    quizletIframe?: string;
    geniallyUrl?: string;
    baamboozleUrl?: string;
    trueFalseTitle?: string;
    trueFalseStatements?: TrueFalseStatement[];
    imageChoiceTitle?: string;
    imageChoiceItems?: ImageChoiceItem[];
    inlineChoiceTitle?: string;
    inlineChoiceSentences?: InlineChoiceSentence[];
    youtubeUrl?: string;
    youtubeTitle?: string;
    vocabularyTitle?: string;
    vocabularyItems?: VocabularyItem[];
  };
}

interface VocabularyItem {
  id: string;
  word: string;
  definition: string;
  imageUrl?: string;
  imageName?: string;
  audioUrl?: string;
  audioName?: string;
}

// Library Files Panel Component
function LibraryFilesPanel({
  onFileSelect,
}: {
  onFileSelect?: (file: any) => void;
}) {
  const { files, folders } = useLibrary();
  const [filter, setFilter] = useState<"all" | "pdf" | "image" | "audio">(
    "all",
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [longPressFile, setLongPressFile] = useState<any>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const filteredFiles = files.filter((file) => {
    const matchesFilter = filter === "all" || file.type === filter;
    const matchesFolder =
      selectedFolderId === null
        ? !file.folderId
        : file.folderId === selectedFolderId;
    return matchesFilter && matchesFolder;
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
    // Start long press detection for tablet drag
    longPressTimerRef.current = setTimeout(() => {
      setLongPressFile(file);
      (window as any).__touchDragFile = file;
      // Vibrate feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 300);

    const target = e.currentTarget as HTMLElement;
    target.dataset.touchStartY = String(e.touches[0].clientY);
    target.dataset.touchStartX = String(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press if moved too much
    const target = e.currentTarget as HTMLElement;
    const startY = parseFloat(target.dataset.touchStartY || "0");
    const startX = parseFloat(target.dataset.touchStartX || "0");
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;

    if (Math.abs(currentY - startY) > 10 || Math.abs(currentX - startX) > 10) {
      if (longPressTimerRef.current && !longPressFile) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setLongPressFile(null);
  };

  // Handle tap to select file (for tablet)
  const handleFileTap = (file: any) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Folder tabs */}
      {folders.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`px-2 py-1 text-[10px] rounded flex items-center gap-1 whitespace-nowrap ${
              selectedFolderId === null
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="material-symbols-outlined text-[12px]">
              folder
            </span>
            All
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`px-2 py-1 text-[10px] rounded flex items-center gap-1 whitespace-nowrap ${
                selectedFolderId === folder.id
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className={`size-2 rounded-sm ${folder.color}`}></span>
              {folder.name}
            </button>
          ))}
        </div>
      )}

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
            const isBeingDragged = longPressFile?.id === file.id;
            return (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onTouchStart={(e) => handleTouchStart(e, file)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleFileTap(file)}
                className={`flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all cursor-move group active:opacity-50 ${isBeingDragged ? "ring-2 ring-indigo-500 bg-indigo-50" : ""}`}
                title={`Drag to add: ${file.name}`}
              >
                {/* Thumbnail for images, icon for others */}
                {file.type === "image" ? (
                  <div className="size-8 rounded overflow-hidden flex-shrink-0 bg-slate-200">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <span
                    className={`material-symbols-outlined text-[18px] ${iconData.color}`}
                  >
                    {iconData.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500">{file.category}</p>
                </div>
                <span className="material-symbols-outlined text-[14px] text-slate-300 group-hover:text-indigo-400">
                  drag_indicator
                </span>
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
  const [lessonStatus, setLessonStatus] = useState<"draft" | "published">(
    "draft",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [curriculumTopicId, setCurriculumTopicId] = useState<string>("");
  const [curriculumTopics, setCurriculumTopics] = useState<any[]>([]);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [actualLessonId, setActualLessonId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Share with students
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [sharedStudentIds, setSharedStudentIds] = useState<string[]>([]);
  const [sharingLoading, setSharingLoading] = useState<string | null>(null);

  // Auto-save function - saves immediately after changes
  const autoSave = async () => {
    // Skip auto-save for new lessons that haven't been created yet
    if (isNewLesson) return;

    try {
      const lessonData = {
        title: lessonTitle,
        modules: modules,
        level: params.level as any,
        status: lessonStatus,
        curriculum_topic_id: curriculumTopicId || undefined,
      };

      await updateLessonContent(params.id as string, lessonData);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // Auto-save immediately when modules, title, or curriculum topic changes
  useEffect(() => {
    // Skip auto-save for new lessons
    if (isNewLesson) return;

    // Skip auto-save on initial load (before lesson is loaded)
    if (!actualLessonId) return;

    // Skip auto-save until initial data has been loaded
    if (!hasInitiallyLoaded) return;

    // Save immediately (even when modules is empty - user may have deleted all modules)
    autoSave();
  }, [modules, lessonTitle, curriculumTopicId]);

  // Load students and share state when lesson id is known
  useEffect(() => {
    if (!params.id || params.id === "new") return;
    fetchStudents().then((s) => setAllStudents(s));
    fetchStudentsForSharedLesson(params.id as string).then((shared) =>
      setSharedStudentIds(shared.map((s) => s.student_id))
    );
  }, [params.id]);

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

  const handleToggleShare = async (studentId: string) => {
    if (!params.id || params.id === "new") return;
    setSharingLoading(studentId);
    try {
      const isShared = sharedStudentIds.includes(studentId);
      if (isShared) {
        await unshareLesson(params.id as string, studentId);
        setSharedStudentIds((prev) => prev.filter((id) => id !== studentId));
      } else {
        await shareLesson(params.id as string, studentId);
        setSharedStudentIds((prev) => [...prev, studentId]);
      }
    } catch {
      showToast("Failed to update sharing. Please try again.", "error");
    } finally {
      setSharingLoading(null);
    }
  };

  // Load lesson from Supabase on mount
  useEffect(() => {
    loadLesson();
  }, [params.level, params.id]);

  const loadLesson = async () => {
    // Check if this is a new lesson
    if (params.id === "new") {
      setIsNewLesson(true);
      setActualLessonId(null);
      setHasInitiallyLoaded(true);
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
      // Mark as loaded AFTER setting all data to prevent auto-save on initial load
      setTimeout(() => setHasInitiallyLoaded(true), 100);
    } else {
      // Lesson not found, treat as new
      setIsNewLesson(true);
      setActualLessonId(null);
      setHasInitiallyLoaded(true);
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
          if (
            !module.content.sentence ||
            module.content.sentence.trim() === ""
          ) {
            errors.push(
              `Module ${moduleNum} (Fill in the Blank): Sentence cannot be empty`,
            );
          } else if (!/\d+\./.test(module.content.sentence)) {
            errors.push(
              `Module ${moduleNum} (Fill in the Blank): Sentence must contain at least one blank using 1. 2. etc.`,
            );
          }
          if (!module.content.answers || module.content.answers.length === 0) {
            errors.push(
              `Module ${moduleNum} (Fill in the Blank): Please add at least one answer`,
            );
          } else if (
            module.content.answers.some((a) => !a || a.trim() === "")
          ) {
            errors.push(
              `Module ${moduleNum} (Fill in the Blank): All answers must be filled in`,
            );
          }
          break;

        case "quiz":
          if (
            !module.content.question ||
            module.content.question.trim() === ""
          ) {
            errors.push(`Module ${moduleNum} (Quiz): Question cannot be empty`);
          }
          if (!module.content.options || module.content.options.length < 2) {
            errors.push(
              `Module ${moduleNum} (Quiz): Must have at least 2 options`,
            );
          } else {
            if (
              module.content.options.some(
                (opt) => !opt.text || opt.text.trim() === "",
              )
            ) {
              errors.push(
                `Module ${moduleNum} (Quiz): All options must have text`,
              );
            }
            if (!module.content.options.some((opt) => opt.isCorrect)) {
              errors.push(
                `Module ${moduleNum} (Quiz): Must mark at least one correct answer`,
              );
            }
          }
          break;

        case "matching":
          if (!module.content.pairs || module.content.pairs.length === 0) {
            errors.push(
              `Module ${moduleNum} (Matching): Please add at least one pair`,
            );
          } else {
            module.content.pairs.forEach((pair, pairIndex) => {
              if (!pair.left || pair.left.trim() === "") {
                errors.push(
                  `Module ${moduleNum} (Matching): Pair ${pairIndex + 1} - Left side cannot be empty`,
                );
              }
              if (module.content.matchingType === "word-definition") {
                if (!pair.right || pair.right.trim() === "") {
                  errors.push(
                    `Module ${moduleNum} (Matching): Pair ${pairIndex + 1} - Right side cannot be empty`,
                  );
                }
              } else if (module.content.matchingType === "word-image") {
                if (!pair.rightImage || pair.rightImage.trim() === "") {
                  errors.push(
                    `Module ${moduleNum} (Matching): Pair ${pairIndex + 1} - Image is required`,
                  );
                }
              }
            });
          }
          break;

        case "image":
          if (
            !module.content.imageItems ||
            module.content.imageItems.length === 0
          ) {
            errors.push(
              `Module ${moduleNum} (Image): Please add at least one image`,
            );
          } else {
            module.content.imageItems.forEach(
              (item: ImageItem, itemIndex: number) => {
                if (!item.imageUrl || item.imageUrl.trim() === "") {
                  errors.push(
                    `Module ${moduleNum} (Image): Image ${itemIndex + 1} - Please upload an image`,
                  );
                }
                if (!item.caption || item.caption.trim() === "") {
                  errors.push(
                    `Module ${moduleNum} (Image): Image ${itemIndex + 1} - Caption is required`,
                  );
                }
              },
            );
          }
          break;

        case "pdf":
          if (!module.content.pdfUrl || module.content.pdfUrl.trim() === "") {
            errors.push(`Module ${moduleNum} (PDF): Please upload a PDF file`);
          }
          break;

        case "audio":
          if (
            !module.content.audioItems ||
            module.content.audioItems.length === 0
          ) {
            errors.push(
              `Module ${moduleNum} (Audio): Please add at least one audio item`,
            );
          } else {
            module.content.audioItems.forEach(
              (item: AudioItem, itemIndex: number) => {
                if (!item.audioUrl || item.audioUrl.trim() === "") {
                  errors.push(
                    `Module ${moduleNum} (Audio): Audio ${itemIndex + 1} - Please upload an audio file`,
                  );
                }
                if (!item.title || item.title.trim() === "") {
                  errors.push(
                    `Module ${moduleNum} (Audio): Audio ${itemIndex + 1} - Title is required`,
                  );
                }
              },
            );
          }
          break;

        case "wordwall":
          if (
            !module.content.wordwallIframe ||
            module.content.wordwallIframe.trim() === ""
          ) {
            errors.push(
              `Module ${moduleNum} (Wordwall): Please add Wordwall iframe code`,
            );
          }
          break;

        case "baamboozle":
          if (
            !module.content.baamboozleUrl ||
            module.content.baamboozleUrl.trim() === ""
          ) {
            errors.push(
              `Module ${moduleNum} (Baamboozle): Please add a Baamboozle link`,
            );
          }
          break;

        case "quizlet":
          if (
            !module.content.quizletIframe ||
            module.content.quizletIframe.trim() === ""
          ) {
            errors.push(
              `Module ${moduleNum} (Quizlet): Please add Quizlet iframe code`,
            );
          }
          break;

        case "genially":
          if (
            !module.content.geniallyUrl ||
            module.content.geniallyUrl.trim() === ""
          ) {
            errors.push(
              `Module ${moduleNum} (Genially): Please add a Genially link`,
            );
          }
          break;

        case "miro":
          if (!module.content.miroUrl || module.content.miroUrl.trim() === "") {
            errors.push(`Module ${moduleNum} (Miro): Please add a Miro link`);
          }
          break;
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  // Create new lesson (only for new lessons)
  const createLesson = async () => {
    const validation = validateModules();
    if (!validation.isValid) {
      showToast(validation.errors[0], "error");
      // Show additional errors if there are multiple
      if (validation.errors.length > 1) {
        setTimeout(() => {
          showToast(
            `${validation.errors.length - 1} more validation error(s)`,
            "warning",
          );
        }, 500);
      }
      return;
    }

    try {
      const lessonData = {
        title: lessonTitle,
        modules: modules,
        level: params.level as any,
        status: "draft" as const,
        curriculum_topic_id: curriculumTopicId || undefined,
      };

      // Create new lesson
      const created = await createLessonContent(lessonData);
      setActualLessonId(created.id);
      setIsNewLesson(false);
      // Redirect to edit page with new ID
      router.push(`/lessons/${params.level}/${created.id}/edit`);
      showToast("Lesson created successfully!", "success");
    } catch (error: any) {
      showToast("Failed to create lesson: " + error.message, "error");
    }
  };

  const publishLesson = async () => {
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

  const unpublishLesson = async () => {
    try {
      await updateLessonContent(params.id as string, {
        title: lessonTitle,
        modules: modules,
        level: params.level as any,
        status: "draft" as const,
        curriculum_topic_id: curriculumTopicId || undefined,
      });
      setLessonStatus("draft");
      showToast("Lesson unpublished", "success");
    } catch (error: any) {
      showToast("Failed to unpublish: " + error.message, "error");
    }
  };

  const deleteLesson = async () => {
    try {
      if (!isNewLesson) {
        await deleteLessonContent(params.id as string, params.level as string);
      }
      showToast(
        "Lesson and all associated files deleted successfully",
        "success",
      );
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
      type: "pdf",
      icon: "picture_as_pdf",
      label: "PDF Document",
      color: "bg-red-100 hover:bg-red-200 text-red-700",
    },
    {
      type: "quiz",
      icon: "quiz",
      label: "Multiple Choice Quiz",
      color: "bg-purple-100 hover:bg-purple-200 text-purple-700",
    },
    {
      type: "truefalse",
      icon: "check_circle",
      label: "True or False",
      color: "bg-emerald-100 hover:bg-emerald-200 text-emerald-700",
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
      type: "imagechoice",
      icon: "imagesmode",
      label: "Image Choice",
      color: "bg-sky-100 hover:bg-sky-200 text-sky-700",
    },
    {
      type: "inlinechoice",
      icon: "list_alt",
      label: "Inline Choice",
      color: "bg-violet-100 hover:bg-violet-200 text-violet-700",
    },
    {
      type: "youtube",
      icon: "play_circle",
      label: "YouTube Video",
      color: "bg-red-100 hover:bg-red-200 text-red-700",
    },
    {
      type: "vocabulary",
      icon: "dictionary",
      label: "Vocabulary Cards",
      color: "bg-lime-100 hover:bg-lime-200 text-lime-700",
    },
    {
      type: "wordwall",
      icon: "extension",
      label: "Wordwall Activity",
      color: "bg-orange-100 hover:bg-orange-200 text-orange-700",
    },
    {
      type: "baamboozle",
      icon: "casino",
      label: "Baamboozle",
      color: "bg-pink-100 hover:bg-pink-200 text-pink-700",
    },
    {
      type: "quizlet",
      icon: "school",
      label: "Quizlet",
      color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700",
    },
    {
      type: "genially",
      icon: "auto_awesome",
      label: "Genially",
      color: "bg-cyan-100 hover:bg-cyan-200 text-cyan-700",
    },
    {
      type: "miro",
      icon: "dashboard",
      label: "Miro Board",
      color: "bg-amber-100 hover:bg-amber-200 text-amber-700",
    },
  ];

  const addModule = (type: string) => {
    const newModule: Module = {
      id: Date.now().toString(),
      type: type as any,
      content:
        type === "quiz"
          ? {
              options: [
                { text: "", isCorrect: true },
                { text: "", isCorrect: false },
              ],
            }
          : type === "matching"
            ? {
                matchingType: "word-definition",
                pairs: [{ left: "", right: "" }],
              }
            : type === "audio"
              ? { audioItems: [] }
              : type === "image"
                ? { imageItems: [] }
                : type === "truefalse"
                  ? {
                      trueFalseTitle: "Wybierz prawda lub fałsz",
                      trueFalseStatements: [
                        {
                          id: Date.now().toString(),
                          statement: "",
                          isTrue: true,
                        },
                      ],
                    }
                  : type === "imagechoice"
                    ? {
                        imageChoiceTitle:
                          "Look at the pictures and choose the correct words",
                        imageChoiceItems: [],
                      }
                    : type === "inlinechoice"
                      ? {
                          inlineChoiceTitle:
                            "Read each sentence and choose the correct word",
                          inlineChoiceSentences: [
                            {
                              id: Date.now().toString(),
                              text: "",
                              blanks: [
                                { correctAnswer: "", options: ["", ""] },
                              ],
                            },
                          ],
                        }
                      : type === "vocabulary"
                        ? {
                            vocabularyTitle: "Słuchaj i powtarzaj",
                            vocabularyItems: [],
                          }
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
          imageItems: [
            {
              id: Date.now().toString(),
              imageUrl: file.url,
              imageName: file.name,
              caption: file.name,
            },
          ],
        },
      };
    } else if (file.type === "audio") {
      newModule = {
        id: Date.now().toString(),
        type: "audio",
        content: {
          audioItems: [
            {
              id: Date.now().toString(),
              audioUrl: file.url,
              audioName: file.name,
              title: file.name,
            },
          ],
        },
      };
    }

    if (newModule) {
      setModules([...modules, newModule]);
      showToast(`Added ${file.name} to lesson`, "success");
    }
  };

  const deleteModule = async (id: string) => {
    const moduleToDelete = modules.find((m) => m.id === id);

    // Delete associated files from R2 storage
    if (moduleToDelete?.content) {
      const content = moduleToDelete.content as Record<string, any>;
      const urlFields = ["imageUrl", "pdfUrl", "audioUrl", "videoUrl"];

      for (const field of urlFields) {
        const url = content[field];
        if (url && typeof url === "string") {
          const filePath = getFilePathFromUrl(url);
          if (filePath) {
            try {
              await deleteFile(filePath);
              console.log(`Deleted file from R2: ${filePath}`);
            } catch (err) {
              console.error(`Error deleting file ${filePath}:`, err);
            }
          }
        }
      }

      // Handle audioItems array for audio modules
      if (
        moduleToDelete.content.audioItems &&
        Array.isArray(moduleToDelete.content.audioItems)
      ) {
        for (const item of moduleToDelete.content.audioItems) {
          if (item.audioUrl) {
            const filePath = getFilePathFromUrl(item.audioUrl);
            if (filePath) {
              try {
                await deleteFile(filePath);
                console.log(`Deleted audio file from R2: ${filePath}`);
              } catch (err) {
                console.error(`Error deleting audio file ${filePath}:`, err);
              }
            }
          }
        }
      }

      // Handle vocabularyItems array for vocabulary modules
      if (
        moduleToDelete.content.vocabularyItems &&
        Array.isArray(moduleToDelete.content.vocabularyItems)
      ) {
        for (const item of moduleToDelete.content.vocabularyItems) {
          if (item.imageUrl) {
            const filePath = getFilePathFromUrl(item.imageUrl);
            if (filePath) {
              try {
                await deleteFile(filePath);
              } catch (err) {
                console.error(`Error deleting vocabulary image:`, err);
              }
            }
          }
          if (item.audioUrl) {
            const filePath = getFilePathFromUrl(item.audioUrl);
            if (filePath) {
              try {
                await deleteFile(filePath);
              } catch (err) {
                console.error(`Error deleting vocabulary audio:`, err);
              }
            }
          }
        }
      }
    }

    setModules(modules.filter((m) => m.id !== id));
  };

  const moveModule = (index: number, direction: "up" | "down") => {
    const newModules = [...modules];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < modules.length) {
      // Get the other module's height before swap (the one we're swapping with)
      const otherModuleElement = document.querySelector(`[data-module-index="${newIndex}"]`);
      const otherModuleHeight = otherModuleElement?.getBoundingClientRect().height || 0;
      const gap = 16; // gap-4 = 16px

      [newModules[index], newModules[newIndex]] = [
        newModules[newIndex],
        newModules[index],
      ];
      setModules(newModules);

      // Adjust scroll so the module stays in the same visual position
      // When moving up, scroll up by the height of the module that moved down
      // When moving down, scroll down by the height of the module that moved up
      const scrollAmount = direction === "up"
        ? -(otherModuleHeight + gap)
        : (otherModuleHeight + gap);

      window.scrollBy({ top: scrollAmount, behavior: "instant" });
    }
  };

  const updateModuleContent = (id: string, content: any) => {
    setModules(
      modules.map((m) =>
        m.id === id ? { ...m, content: { ...m.content, ...content } } : m,
      ),
    );
  };

  // Quiz functions
  const addQuizOption = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.options) {
      updateModuleContent(moduleId, {
        options: [...module.content.options, { text: "", isCorrect: false }],
      });
    }
  };

  const removeQuizOption = (moduleId: string, index: number) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.options && module.content.options.length > 2) {
      const newOptions = module.content.options.filter((_, i) => i !== index);
      updateModuleContent(moduleId, { options: newOptions });
    }
  };

  const updateQuizOption = (moduleId: string, index: number, text: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.options) {
      const newOptions = [...module.content.options];
      newOptions[index].text = text;
      updateModuleContent(moduleId, { options: newOptions });
    }
  };

  const setCorrectAnswer = (moduleId: string, index: number) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.options) {
      const newOptions = module.content.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      updateModuleContent(moduleId, { options: newOptions });
    }
  };

  // Matching functions
  const addMatchingPair = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.pairs) {
      updateModuleContent(moduleId, {
        pairs: [...module.content.pairs, { left: "", right: "" }],
      });
    }
  };

  const removeMatchingPair = (moduleId: string, index: number) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.pairs && module.content.pairs.length > 1) {
      const newPairs = module.content.pairs.filter((_, i) => i !== index);
      updateModuleContent(moduleId, { pairs: newPairs });
    }
  };

  const updateMatchingPair = (
    moduleId: string,
    index: number,
    field: "left" | "right",
    value: string,
  ) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.pairs) {
      const newPairs = [...module.content.pairs];
      newPairs[index][field] = value;
      updateModuleContent(moduleId, { pairs: newPairs });
    }
  };

  // File upload handlers - Upload to Supabase Storage
  const handleFileUpload = async (
    moduleId: string,
    type: "image" | "pdf" | "audio",
    file: File,
  ) => {
    try {
      // Get lesson ID
      const lessonId = actualLessonId || (params.id as string);

      // Process file (compress images, validate size)
      const {
        processedFile,
        originalSize,
        compressedSize,
        compressionRatio,
        valid,
        message,
      } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Show compression info for images
      if (type === "image" && compressionRatio > 0) {
        console.log(
          `Image compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio.toFixed(0)}% reduction)`,
        );
      }

      // Upload to Supabase Storage
      const { url, name } = await uploadFile(
        processedFile,
        `lessons/${params.level}/${lessonId}`,
      );

      if (type === "image") {
        updateModuleContent(moduleId, {
          imageUrl: url,
          imageName: name,
        });
      } else if (type === "pdf") {
        updateModuleContent(moduleId, {
          pdfUrl: url,
          pdfName: name,
        });
      } else if (type === "audio") {
        updateModuleContent(moduleId, {
          audioUrl: url,
          audioName: name,
        });
      }

      showToast("Uploaded successfully!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  const handleMatchingImageUpload = async (
    moduleId: string,
    pairIndex: number,
    file: File,
  ) => {
    try {
      const lessonId = actualLessonId || (params.id as string);

      // Process file (compress images, validate size)
      const { processedFile, valid, message } =
        await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Upload to Supabase Storage
      const { url } = await uploadFile(
        processedFile,
        `lessons/${params.level}/${lessonId}`,
      );

      const module = modules.find((m) => m.id === moduleId);
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
    const module = modules.find((m) => m.id === moduleId);
    if (module) {
      const audioItems = module.content.audioItems || [];
      updateModuleContent(moduleId, {
        audioItems: [
          ...audioItems,
          { id: Date.now().toString(), audioUrl: "", audioName: "", title: "" },
        ],
      });
    }
  };

  const removeAudioItem = async (moduleId: string, itemId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.audioItems) {
      // Find the item to delete
      const itemToDelete = module.content.audioItems.find(
        (item) => item.id === itemId,
      );

      // Delete from storage if it has a URL
      if (itemToDelete?.audioUrl) {
        try {
          const filePath = getFilePathFromUrl(itemToDelete.audioUrl);
          if (filePath) {
            await deleteFile(filePath);
          }
        } catch (error) {
          console.error("Failed to delete audio file from storage:", error);
        }
      }

      const newItems = module.content.audioItems.filter(
        (item) => item.id !== itemId,
      );
      updateModuleContent(moduleId, { audioItems: newItems });
    }
  };

  const updateAudioItemTitle = (
    moduleId: string,
    itemId: string,
    title: string,
  ) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.audioItems) {
      const newItems = module.content.audioItems.map((item) =>
        item.id === itemId ? { ...item, title } : item,
      );
      updateModuleContent(moduleId, { audioItems: newItems });
    }
  };

  const handleAudioItemUpload = async (
    moduleId: string,
    itemId: string,
    file: File,
  ) => {
    try {
      const lessonId = actualLessonId || (params.id as string);

      // Process file (validate size for audio)
      const { processedFile, valid, message } =
        await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Upload to Supabase Storage
      const { url, name } = await uploadFile(
        processedFile,
        `lessons/${params.level}/${lessonId}`,
      );

      const module = modules.find((m) => m.id === moduleId);
      if (module && module.content.audioItems) {
        const newItems = module.content.audioItems.map((item) =>
          item.id === itemId
            ? { ...item, audioUrl: url, audioName: name }
            : item,
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
    const module = modules.find((m) => m.id === moduleId);
    if (module) {
      const imageItems = module.content.imageItems || [];
      updateModuleContent(moduleId, {
        imageItems: [
          ...imageItems,
          {
            id: Date.now().toString(),
            imageUrl: "",
            imageName: "",
            caption: "",
          },
        ],
      });
    }
  };

  const removeImageItem = async (moduleId: string, itemId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.imageItems) {
      // Find the item to delete
      const itemToDelete = module.content.imageItems.find(
        (item) => item.id === itemId,
      );

      // Delete from storage if it has a URL
      if (itemToDelete?.imageUrl) {
        try {
          const filePath = getFilePathFromUrl(itemToDelete.imageUrl);
          if (filePath) {
            await deleteFile(filePath);
          }
        } catch (error) {
          console.error("Failed to delete image file from storage:", error);
        }
      }

      const newItems = module.content.imageItems.filter(
        (item) => item.id !== itemId,
      );
      updateModuleContent(moduleId, { imageItems: newItems });
    }
  };

  const updateImageItemCaption = (
    moduleId: string,
    itemId: string,
    caption: string,
  ) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.imageItems) {
      const newItems = module.content.imageItems.map((item) =>
        item.id === itemId ? { ...item, caption } : item,
      );
      updateModuleContent(moduleId, { imageItems: newItems });
    }
  };

  const handleImageItemUpload = async (
    moduleId: string,
    itemId: string,
    file: File,
  ) => {
    try {
      const lessonId = actualLessonId || (params.id as string);

      // Process file (compress images, validate size)
      const { processedFile, valid, message } =
        await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      // Upload to Supabase Storage
      const { url, name } = await uploadFile(
        processedFile,
        `lessons/${params.level}/${lessonId}`,
      );

      const module = modules.find((m) => m.id === moduleId);
      if (module && module.content.imageItems) {
        const newItems = module.content.imageItems.map((item) =>
          item.id === itemId
            ? { ...item, imageUrl: url, imageName: name }
            : item,
        );
        updateModuleContent(moduleId, { imageItems: newItems });
      }

      showToast("Uploaded successfully!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  // Vocabulary Item Functions
  const addVocabularyItem = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module) {
      const vocabularyItems = module.content.vocabularyItems || [];
      updateModuleContent(moduleId, {
        vocabularyItems: [
          ...vocabularyItems,
          { id: Date.now().toString(), word: "", definition: "", imageUrl: "", audioUrl: "" },
        ],
      });
    }
  };

  const removeVocabularyItem = async (moduleId: string, itemId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.vocabularyItems) {
      const itemToDelete = module.content.vocabularyItems.find((item) => item.id === itemId);

      // Delete image and audio from storage if they exist
      if (itemToDelete?.imageUrl) {
        const filePath = getFilePathFromUrl(itemToDelete.imageUrl);
        if (filePath) {
          try {
            await deleteFile(filePath);
          } catch (err) {
            console.error("Error deleting vocabulary image:", err);
          }
        }
      }
      if (itemToDelete?.audioUrl) {
        const filePath = getFilePathFromUrl(itemToDelete.audioUrl);
        if (filePath) {
          try {
            await deleteFile(filePath);
          } catch (err) {
            console.error("Error deleting vocabulary audio:", err);
          }
        }
      }

      updateModuleContent(moduleId, {
        vocabularyItems: module.content.vocabularyItems.filter((item) => item.id !== itemId),
      });
    }
  };

  const updateVocabularyItem = (moduleId: string, itemId: string, field: string, value: string) => {
    const module = modules.find((m) => m.id === moduleId);
    if (module && module.content.vocabularyItems) {
      const newItems = module.content.vocabularyItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
      updateModuleContent(moduleId, { vocabularyItems: newItems });
    }
  };

  const handleVocabularyImageUpload = async (moduleId: string, itemId: string, file: File) => {
    try {
      const lessonId = actualLessonId || (params.id as string);
      const { processedFile, valid, message } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      const { url, name } = await uploadFile(processedFile, `lessons/${params.level}/${lessonId}`);

      const module = modules.find((m) => m.id === moduleId);
      if (module && module.content.vocabularyItems) {
        const newItems = module.content.vocabularyItems.map((item) =>
          item.id === itemId ? { ...item, imageUrl: url, imageName: name } : item
        );
        updateModuleContent(moduleId, { vocabularyItems: newItems });
      }
      showToast("Image uploaded!", "success");
    } catch (error: any) {
      showToast("Upload failed: " + error.message, "error");
    }
  };

  const handleVocabularyAudioUpload = async (moduleId: string, itemId: string, file: File) => {
    try {
      const lessonId = actualLessonId || (params.id as string);
      const { processedFile, valid, message } = await processFileForUpload(file);

      if (!valid) {
        showToast(message || "File too large", "error");
        return;
      }

      const { url, name } = await uploadFile(processedFile, `lessons/${params.level}/${lessonId}`);

      const module = modules.find((m) => m.id === moduleId);
      if (module && module.content.vocabularyItems) {
        const newItems = module.content.vocabularyItems.map((item) =>
          item.id === itemId ? { ...item, audioUrl: url, audioName: name } : item
        );
        updateModuleContent(moduleId, { vocabularyItems: newItems });
      }
      showToast("Audio uploaded!", "success");
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
              {isNewLesson ? (
                <button
                  onClick={createLesson}
                  className="hidden md:block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Create Lesson
                </button>
              ) : (
                <>
                  {lessonStatus === "draft" && (
                    <button
                      onClick={publishLesson}
                      className="hidden md:block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      Publish
                    </button>
                  )}
                  {lessonStatus === "published" && (
                    <button
                      onClick={unpublishLesson}
                      className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 rounded-md border border-emerald-200 transition-colors group"
                      title="Click to unpublish"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500 group-hover:bg-amber-500"></span>
                      <span className="group-hover:hidden">Published</span>
                      <span className="hidden group-hover:inline">Unpublish</span>
                    </button>
                  )}
                </>
              )}

              {/* Mobile Buttons */}
              {isNewLesson ? (
                <button
                  onClick={createLesson}
                  className="md:hidden p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  title="Create Lesson"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    add
                  </span>
                </button>
              ) : (
                <>
                  {lessonStatus === "draft" && (
                    <button
                      onClick={publishLesson}
                      className="md:hidden p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                      title="Publish"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        publish
                      </span>
                    </button>
                  )}
                  {lessonStatus === "published" && (
                    <button
                      onClick={unpublishLesson}
                      className="md:hidden p-2 bg-emerald-100 hover:bg-amber-100 text-emerald-600 hover:text-amber-600 rounded-lg transition-colors"
                      title="Unpublish"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        unpublished
                      </span>
                    </button>
                  )}
                </>
              )}

              <Link
                href={`/lessons/${params.level}/${params.id}/present`}
                className="inline-flex items-center gap-2 px-2 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  present_to_all
                </span>
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
                <span className="material-symbols-outlined text-[22px]">
                  {module.icon}
                </span>
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
                  <span className="material-symbols-outlined text-[20px]">
                    {module.icon}
                  </span>
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
                  <span className="material-symbols-outlined text-[16px]">
                    open_in_new
                  </span>
                </Link>
              </h4>
              <LibraryFilesPanel onFileSelect={addModuleFromLibrary} />
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                Curriculum Topic
              </h4>
              <select
                value={curriculumTopicId}
                onChange={(e) => setCurriculumTopicId(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer mb-4"
                style={{ fontSize: "12px" }}
              >
                <option value="" style={{ fontSize: "12px" }}>
                  No topic assigned
                </option>
                {curriculumTopics.map((topic) => (
                  <option
                    key={topic.id}
                    value={topic.id}
                    style={{ fontSize: "12px" }}
                  >
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

            {/* Share with Students */}
            {!isNewLesson && allStudents.filter((s) => s.status === "active").length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">share</span>
                  Share with Students
                </h4>
                <div className="space-y-1.5">
                  {allStudents
                    .filter((s) => s.status === "active")
                    .map((student) => {
                      const isShared = sharedStudentIds.includes(student.id);
                      const isLoading = sharingLoading === student.id;
                      return (
                        <button
                          key={student.id}
                          onClick={() => handleToggleShare(student.id)}
                          disabled={isLoading}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                            isShared
                              ? "bg-indigo-50 border border-indigo-200"
                              : "bg-slate-50 border border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className="size-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: student.color }}
                          >
                            {student.initials}
                          </div>
                          <span className={`text-xs font-medium flex-1 truncate ${isShared ? "text-indigo-700" : "text-slate-600"}`}>
                            {student.name}
                          </span>
                          {isLoading ? (
                            <svg className="h-3.5 w-3.5 animate-spin text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <span className={`material-symbols-outlined text-sm shrink-0 ${isShared ? "text-indigo-500" : "text-slate-300"}`}>
                              {isShared ? "check_circle" : "radio_button_unchecked"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
                {sharedStudentIds.length > 0 && (
                  <p className="text-[11px] text-indigo-600 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Shared with {sharedStudentIds.length} student{sharedStudentIds.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
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
                  <h3 className="text-lg font-bold text-[#1e293b] mb-2">
                    Start Building Your Lesson
                  </h3>
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
                      data-module-index={index}
                      className="bg-white rounded-lg md:rounded-xl border-2 border-slate-200 hover:border-indigo-300 p-3 md:p-6 group transition-all"
                    >
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-slate-400 text-[20px] md:text-[24px] flex-shrink-0">
                            {
                              moduleTypes.find((t) => t.type === module.type)
                                ?.icon
                            }
                          </span>
                          <span className="font-medium text-slate-700 text-sm md:text-base truncate">
                            {
                              moduleTypes.find((t) => t.type === module.type)
                                ?.label
                            }
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
                            onClick={() => void deleteModule(module.id)}
                            className="p-1 hover:bg-red-50 text-red-600 rounded"
                          >
                            <span className="material-symbols-outlined text-[16px] md:text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Module Content Editor */}
                      <div className="bg-slate-50 rounded-lg p-3 md:p-4 min-h-[100px]">
                        {/* TEXT MODULE */}
                        {module.type === "text" && (
                          <div className="space-y-3">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Bold Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `text-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.text || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `**${selectedText}**` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        text: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Bold (select text first)"
                              >
                                <span className="font-bold text-sm">B</span>
                              </button>

                              {/* Italic Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `text-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.text || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `*${selectedText}*` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        text: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Italic (select text first)"
                              >
                                <span className="italic text-sm">I</span>
                              </button>

                              {/* Underline Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `text-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.text || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `__${selectedText}__` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        text: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Underline (select text first)"
                              >
                                <span className="underline text-sm">U</span>
                              </button>

                              {/* Divider */}
                              <div className="w-px h-6 bg-slate-200" />

                              {/* Background Color Picker */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500 mr-1">
                                  Background:
                                </span>
                                {[
                                  { color: "#ffffff", name: "White" },
                                  { color: "#f0efed", name: "Gray" },
                                  { color: "#f5ede9", name: "Brown" },
                                  { color: "#f0cdb1", name: "Orange" },
                                  { color: "#f9f3dc", name: "Yellow" },
                                  { color: "#e8f1ec", name: "Green" },
                                  { color: "#e5f2fc", name: "Blue" },
                                  { color: "#f3ebf9", name: "Purple" },
                                  { color: "#fae9f1", name: "Pink" },
                                  { color: "#fce9e7", name: "Red" },
                                ].map((bg) => (
                                  <button
                                    key={bg.color}
                                    type="button"
                                    onClick={() =>
                                      updateModuleContent(module.id, {
                                        textBgColor: bg.color,
                                      })
                                    }
                                    className={`size-6 rounded border-2 transition-all ${
                                      (module.content.textBgColor ||
                                        "#ffffff") === bg.color
                                        ? "border-indigo-500 scale-110"
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                    style={{ backgroundColor: bg.color }}
                                    title={bg.name}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Textarea with background color preview */}
                            <textarea
                              id={`text-textarea-${module.id}`}
                              value={module.content.text || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  text: e.target.value,
                                })
                              }
                              className="w-full min-h-[100px] rounded border border-slate-200 p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              style={{
                                backgroundColor:
                                  module.content.textBgColor || "#ffffff",
                              }}
                              placeholder="Enter your text content here... Use **text** for bold."
                            />
                          </div>
                        )}

                        {/* FILL IN THE BLANK MODULE */}
                        {module.type === "fillblank" && (
                          <div className="space-y-3">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Add Blank Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `fillblank-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const text = module.content.sentence || "";
                                    // Count existing blanks to determine next number
                                    const matches = text.match(/\d+\./g) || [];
                                    const nextNum = matches.length + 1;
                                    const newText =
                                      text.substring(0, start) +
                                      `${nextNum}.` +
                                      text.substring(start);
                                    updateModuleContent(module.id, {
                                      sentence: newText,
                                    });
                                    // Focus back and set cursor position
                                    setTimeout(() => {
                                      textarea.focus();
                                      const newPos =
                                        start + `${nextNum}.`.length;
                                      textarea.setSelectionRange(
                                        newPos,
                                        newPos,
                                      );
                                    }, 0);
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
                                title="Add blank (1., 2., etc.)"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  add
                                </span>
                                <span className="text-xs font-medium">
                                  Blank
                                </span>
                              </button>

                              <div className="w-px h-6 bg-slate-200" />

                              {/* Bold Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `fillblank-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.sentence || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `**${selectedText}**` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        sentence: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Bold (select text first)"
                              >
                                <span className="font-bold text-sm">B</span>
                              </button>

                              {/* Italic Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `fillblank-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.sentence || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `*${selectedText}*` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        sentence: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Italic (select text first)"
                              >
                                <span className="italic text-sm">I</span>
                              </button>

                              {/* Underline Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `fillblank-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.sentence || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `__${selectedText}__` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        sentence: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Underline (select text first)"
                              >
                                <span className="underline text-sm">U</span>
                              </button>
                            </div>

                            <textarea
                              id={`fillblank-textarea-${module.id}`}
                              rows={4}
                              value={module.content.sentence || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  sentence: e.target.value,
                                })
                              }
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                              placeholder="Enter sentence with 1. 2. for blanks. E.g.: The cat 1. on the 2."
                            />
                            <input
                              type="text"
                              value={module.content.answers?.join(", ") || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  answers: e.target.value
                                    .split(",")
                                    .map((s) => s.trim()),
                                })
                              }
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Correct answers in order (comma separated). E.g.: sat, mat"
                            />
                          </div>
                        )}

                        {/* QUIZ MODULE */}
                        {module.type === "quiz" && (
                          <div className="space-y-3">
                            {/* Toolbar */}
                            <div className="flex items-center gap-2">
                              {/* Bold Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `quiz-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.question || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `**${selectedText}**` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        question: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Bold (select text first)"
                              >
                                <span className="font-bold text-sm">B</span>
                              </button>

                              {/* Italic Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `quiz-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.question || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `*${selectedText}*` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        question: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Italic (select text first)"
                              >
                                <span className="italic text-sm">I</span>
                              </button>

                              {/* Underline Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(
                                    `quiz-textarea-${module.id}`,
                                  ) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = module.content.question || "";
                                    const selectedText = text.substring(
                                      start,
                                      end,
                                    );
                                    if (selectedText) {
                                      const newText =
                                        text.substring(0, start) +
                                        `__${selectedText}__` +
                                        text.substring(end);
                                      updateModuleContent(module.id, {
                                        question: newText,
                                      });
                                    }
                                  }
                                }}
                                className="flex items-center justify-center size-8 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                title="Underline (select text first)"
                              >
                                <span className="underline text-sm">U</span>
                              </button>
                            </div>

                            <textarea
                              id={`quiz-textarea-${module.id}`}
                              rows={2}
                              value={module.content.question || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  question: e.target.value,
                                })
                              }
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                              placeholder="Quiz question..."
                            />

                            {/* Question Image */}
                            <div className="flex gap-2">
                              {module.content.questionImageUrl ? (
                                <div className="relative w-40 h-24 border-2 border-purple-200 rounded overflow-hidden group">
                                  <img
                                    src={module.content.questionImageUrl}
                                    alt="Question"
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    onClick={async () => {
                                      // Delete from storage first
                                      if (module.content.questionImageUrl) {
                                        try {
                                          const filePath = getFilePathFromUrl(
                                            module.content.questionImageUrl,
                                          );
                                          if (filePath) {
                                            await deleteFile(filePath);
                                          }
                                        } catch (error) {
                                          console.error(
                                            "Failed to delete question image from storage:",
                                            error,
                                          );
                                        }
                                      }
                                      updateModuleContent(module.id, {
                                        questionImageUrl: undefined,
                                        questionImageName: undefined,
                                      });
                                    }}
                                    className="absolute top-1 right-1 px-2 py-0.5 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium rounded transition-all"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="flex items-center justify-center w-40 h-24 border-2 border-dashed border-purple-300 rounded bg-white cursor-pointer hover:bg-purple-50/50 transition-colors"
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.classList.add(
                                      "border-purple-500",
                                      "bg-purple-100",
                                    );
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove(
                                      "border-purple-500",
                                      "bg-purple-100",
                                    );
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.classList.remove(
                                      "border-purple-500",
                                      "bg-purple-100",
                                    );
                                    const fileData =
                                      e.dataTransfer.getData("library-file");
                                    if (fileData) {
                                      try {
                                        const file = JSON.parse(fileData);
                                        if (file.type === "image") {
                                          updateModuleContent(module.id, {
                                            questionImageUrl: file.url,
                                            questionImageName: file.name,
                                          });
                                        }
                                      } catch (err) {
                                        console.error(
                                          "Failed to parse dropped file:",
                                          err,
                                        );
                                      }
                                    }
                                  }}
                                >
                                  <label className="flex items-center justify-center w-full h-full cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const lessonId =
                                              actualLessonId ||
                                              (params.id as string);
                                            const { url, name } =
                                              await uploadFile(
                                                file,
                                                `lessons/${params.level}/${lessonId}`,
                                              );
                                            updateModuleContent(module.id, {
                                              questionImageUrl: url,
                                              questionImageName: name,
                                            });
                                            showToast(
                                              "Uploaded successfully!",
                                              "success",
                                            );
                                          } catch (error: any) {
                                            showToast(
                                              "Upload failed: " + error.message,
                                              "error",
                                            );
                                          } finally {
                                            e.target.value = "";
                                          }
                                        }
                                      }}
                                      className="hidden"
                                    />
                                    <div className="text-center">
                                      <span className="material-symbols-outlined text-xl text-purple-400">
                                        image
                                      </span>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Add/Drag image
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              )}

                              {/* Question Audio */}
                              {module.content.questionAudioUrl ? (
                                <div className="flex-1 bg-purple-50 border-2 border-purple-200 rounded p-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-purple-700 font-medium">
                                      {module.content.questionAudioName}
                                    </span>
                                    <button
                                      onClick={async () => {
                                        // Delete from storage first
                                        if (module.content.questionAudioUrl) {
                                          try {
                                            const filePath = getFilePathFromUrl(
                                              module.content.questionAudioUrl,
                                            );
                                            if (filePath) {
                                              await deleteFile(filePath);
                                            }
                                          } catch (error) {
                                            console.error(
                                              "Failed to delete question audio from storage:",
                                              error,
                                            );
                                          }
                                        }
                                        updateModuleContent(module.id, {
                                          questionAudioUrl: undefined,
                                          questionAudioName: undefined,
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                  <audio controls className="w-full h-7">
                                    <source
                                      src={module.content.questionAudioUrl}
                                    />
                                  </audio>
                                </div>
                              ) : (
                                <div
                                  className="flex-1 flex items-center justify-center h-24 border-2 border-dashed border-purple-300 rounded bg-white cursor-pointer hover:bg-purple-50/50 transition-colors"
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.classList.add(
                                      "border-purple-500",
                                      "bg-purple-100",
                                    );
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove(
                                      "border-purple-500",
                                      "bg-purple-100",
                                    );
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.classList.remove(
                                      "border-purple-500",
                                      "bg-purple-100",
                                    );
                                    const fileData =
                                      e.dataTransfer.getData("library-file");
                                    if (fileData) {
                                      try {
                                        const file = JSON.parse(fileData);
                                        if (file.type === "audio") {
                                          updateModuleContent(module.id, {
                                            questionAudioUrl: file.url,
                                            questionAudioName: file.name,
                                          });
                                        }
                                      } catch (err) {
                                        console.error(
                                          "Failed to parse dropped file:",
                                          err,
                                        );
                                      }
                                    }
                                  }}
                                >
                                  <label className="flex items-center justify-center w-full h-full cursor-pointer">
                                    <input
                                      type="file"
                                      accept="audio/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const lessonId =
                                              actualLessonId ||
                                              (params.id as string);
                                            const { url, name } =
                                              await uploadFile(
                                                file,
                                                `lessons/${params.level}/${lessonId}`,
                                              );
                                            updateModuleContent(module.id, {
                                              questionAudioUrl: url,
                                              questionAudioName: name,
                                            });
                                            showToast(
                                              "Uploaded successfully!",
                                              "success",
                                            );
                                          } catch (error: any) {
                                            showToast(
                                              "Upload failed: " + error.message,
                                              "error",
                                            );
                                          } finally {
                                            e.target.value = "";
                                          }
                                        }
                                      }}
                                      className="hidden"
                                    />
                                    <div className="text-center">
                                      <span className="material-symbols-outlined text-xl text-purple-400">
                                        volume_up
                                      </span>
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Add/Drag audio
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              {module.content.options?.map((option, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="radio"
                                    name={`quiz-${module.id}`}
                                    checked={option.isCorrect}
                                    onChange={() =>
                                      setCorrectAnswer(module.id, i)
                                    }
                                    className="cursor-pointer"
                                    title="Mark as correct answer"
                                  />
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) =>
                                      updateQuizOption(
                                        module.id,
                                        i,
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder={`Option ${i + 1}`}
                                  />
                                  {module.content.options &&
                                    module.content.options.length > 2 && (
                                      <button
                                        onClick={() =>
                                          removeQuizOption(module.id, i)
                                        }
                                        className="p-1 hover:bg-red-50 text-red-600 rounded"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          close
                                        </span>
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
                              <label className="text-sm font-medium text-slate-700">
                                Matching Type:
                              </label>
                              <select
                                value={
                                  module.content.matchingType ||
                                  "word-definition"
                                }
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    matchingType: e.target.value,
                                  })
                                }
                                className="px-3 py-1 bg-white rounded border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              >
                                <option value="word-definition">
                                  Word - Definition
                                </option>
                                <option value="word-image">Word - Image</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              {module.content.pairs?.map((pair, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="text"
                                    value={pair.left}
                                    onChange={(e) =>
                                      updateMatchingPair(
                                        module.id,
                                        i,
                                        "left",
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 bg-white rounded border border-slate-200 px-2 md:px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-0"
                                    placeholder="Left"
                                  />
                                  <span className="material-symbols-outlined text-slate-400 text-sm md:text-base">
                                    swap_horiz
                                  </span>
                                  {module.content.matchingType ===
                                  "word-image" ? (
                                    <div className="flex-1 relative min-w-0">
                                      {pair.rightImage ? (
                                        <div className="relative h-16 md:h-20 w-full border-2 border-slate-200 rounded overflow-hidden group">
                                          <img
                                            src={pair.rightImage}
                                            alt="Match"
                                            className="w-full h-full object-cover"
                                          />
                                          <button
                                            onClick={async () => {
                                              // Delete from storage first
                                              if (pair.rightImage) {
                                                try {
                                                  const filePath =
                                                    getFilePathFromUrl(
                                                      pair.rightImage,
                                                    );
                                                  if (filePath) {
                                                    await deleteFile(filePath);
                                                  }
                                                } catch (error) {
                                                  console.error(
                                                    "Failed to delete matching pair image from storage:",
                                                    error,
                                                  );
                                                }
                                              }
                                              const newPairs = [
                                                ...(module.content.pairs || []),
                                              ];
                                              delete newPairs[i].rightImage;
                                              updateModuleContent(module.id, {
                                                pairs: newPairs,
                                              });
                                            }}
                                            className="absolute top-1 right-1 md:top-2 md:right-2 px-1.5 md:px-2 py-0.5 bg-black/60 hover:bg-black/80 text-white text-[9px] md:text-[10px] font-medium rounded transition-all"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ) : (
                                        <div
                                          className="flex items-center justify-center h-16 md:h-20 border-2 border-dashed border-slate-300 rounded bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.currentTarget.classList.add(
                                              "border-indigo-500",
                                              "bg-indigo-50",
                                            );
                                          }}
                                          onDragLeave={(e) => {
                                            e.currentTarget.classList.remove(
                                              "border-indigo-500",
                                              "bg-indigo-50",
                                            );
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.currentTarget.classList.remove(
                                              "border-indigo-500",
                                              "bg-indigo-50",
                                            );
                                            const fileData =
                                              e.dataTransfer.getData(
                                                "library-file",
                                              );
                                            if (fileData) {
                                              try {
                                                const file =
                                                  JSON.parse(fileData);
                                                if (file.type === "image") {
                                                  const newPairs = [
                                                    ...(module.content.pairs ||
                                                      []),
                                                  ];
                                                  newPairs[i] = {
                                                    ...newPairs[i],
                                                    rightImage: file.url,
                                                  };
                                                  updateModuleContent(
                                                    module.id,
                                                    { pairs: newPairs },
                                                  );
                                                }
                                              } catch (err) {
                                                console.error(
                                                  "Failed to parse dropped file:",
                                                  err,
                                                );
                                              }
                                            }
                                          }}
                                        >
                                          <label className="flex items-center justify-center w-full h-full cursor-pointer">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => {
                                                const file =
                                                  e.target.files?.[0];
                                                if (file)
                                                  handleMatchingImageUpload(
                                                    module.id,
                                                    i,
                                                    file,
                                                  );
                                              }}
                                              className="hidden"
                                            />
                                            <div className="text-center">
                                              <span className="material-symbols-outlined text-lg md:text-2xl text-slate-400">
                                                image
                                              </span>
                                              <p className="text-[9px] md:text-xs text-slate-500 mt-0.5 md:mt-1">
                                                Upload/Drag
                                              </p>
                                            </div>
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={pair.right}
                                      onChange={(e) =>
                                        updateMatchingPair(
                                          module.id,
                                          i,
                                          "right",
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1 bg-white rounded border border-slate-200 px-2 md:px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-0"
                                      placeholder="Right"
                                    />
                                  )}
                                  {module.content.pairs &&
                                    module.content.pairs.length > 1 && (
                                      <button
                                        onClick={() =>
                                          removeMatchingPair(module.id, i)
                                        }
                                        className="p-1 hover:bg-red-50 text-red-600 rounded flex-shrink-0"
                                      >
                                        <span className="material-symbols-outlined text-[16px] md:text-[18px]">
                                          close
                                        </span>
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

                        {/* TRUE/FALSE MODULE */}
                        {module.type === "truefalse" && (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={module.content.trueFalseTitle || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  trueFalseTitle: e.target.value,
                                })
                              }
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              placeholder="Title (e.g., Choose true or false)"
                            />

                            <div className="space-y-2">
                              {module.content.trueFalseStatements?.map(
                                (statement, i) => (
                                  <div
                                    key={statement.id}
                                    className="bg-white p-3 rounded-lg border border-slate-200"
                                  >
                                    {/* Toolbar */}
                                    <div className="flex items-center gap-1 mb-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.getElementById(
                                            `truefalse-input-${statement.id}`,
                                          ) as HTMLInputElement;
                                          if (input) {
                                            const start =
                                              input.selectionStart || 0;
                                            const end = input.selectionEnd || 0;
                                            const text =
                                              statement.statement || "";
                                            const selectedText = text.substring(
                                              start,
                                              end,
                                            );
                                            if (selectedText) {
                                              const newText =
                                                text.substring(0, start) +
                                                `**${selectedText}**` +
                                                text.substring(end);
                                              const newStatements = [
                                                ...(module.content
                                                  .trueFalseStatements || []),
                                              ];
                                              newStatements[i] = {
                                                ...newStatements[i],
                                                statement: newText,
                                              };
                                              updateModuleContent(module.id, {
                                                trueFalseStatements:
                                                  newStatements,
                                              });
                                            }
                                          }
                                        }}
                                        className="flex items-center justify-center size-6 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                        title="Bold"
                                      >
                                        <span className="font-bold text-xs">
                                          B
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.getElementById(
                                            `truefalse-input-${statement.id}`,
                                          ) as HTMLInputElement;
                                          if (input) {
                                            const start =
                                              input.selectionStart || 0;
                                            const end = input.selectionEnd || 0;
                                            const text =
                                              statement.statement || "";
                                            const selectedText = text.substring(
                                              start,
                                              end,
                                            );
                                            if (selectedText) {
                                              const newText =
                                                text.substring(0, start) +
                                                `*${selectedText}*` +
                                                text.substring(end);
                                              const newStatements = [
                                                ...(module.content
                                                  .trueFalseStatements || []),
                                              ];
                                              newStatements[i] = {
                                                ...newStatements[i],
                                                statement: newText,
                                              };
                                              updateModuleContent(module.id, {
                                                trueFalseStatements:
                                                  newStatements,
                                              });
                                            }
                                          }
                                        }}
                                        className="flex items-center justify-center size-6 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                        title="Italic"
                                      >
                                        <span className="italic text-xs">
                                          I
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.getElementById(
                                            `truefalse-input-${statement.id}`,
                                          ) as HTMLInputElement;
                                          if (input) {
                                            const start =
                                              input.selectionStart || 0;
                                            const end = input.selectionEnd || 0;
                                            const text =
                                              statement.statement || "";
                                            const selectedText = text.substring(
                                              start,
                                              end,
                                            );
                                            if (selectedText) {
                                              const newText =
                                                text.substring(0, start) +
                                                `__${selectedText}__` +
                                                text.substring(end);
                                              const newStatements = [
                                                ...(module.content
                                                  .trueFalseStatements || []),
                                              ];
                                              newStatements[i] = {
                                                ...newStatements[i],
                                                statement: newText,
                                              };
                                              updateModuleContent(module.id, {
                                                trueFalseStatements:
                                                  newStatements,
                                              });
                                            }
                                          }
                                        }}
                                        className="flex items-center justify-center size-6 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                        title="Underline"
                                      >
                                        <span className="underline text-xs">
                                          U
                                        </span>
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <input
                                          id={`truefalse-input-${statement.id}`}
                                          type="text"
                                          value={statement.statement}
                                          onChange={(e) => {
                                            const newStatements = [
                                              ...(module.content
                                                .trueFalseStatements || []),
                                            ];
                                            newStatements[i] = {
                                              ...newStatements[i],
                                              statement: e.target.value,
                                            };
                                            updateModuleContent(module.id, {
                                              trueFalseStatements:
                                                newStatements,
                                            });
                                          }}
                                          className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                          placeholder="Enter statement..."
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            const newStatements = [
                                              ...(module.content
                                                .trueFalseStatements || []),
                                            ];
                                            newStatements[i] = {
                                              ...newStatements[i],
                                              isTrue: true,
                                            };
                                            updateModuleContent(module.id, {
                                              trueFalseStatements:
                                                newStatements,
                                            });
                                          }}
                                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                            statement.isTrue
                                              ? "bg-emerald-500 text-white"
                                              : "bg-slate-100 text-slate-600 hover:bg-emerald-100"
                                          }`}
                                        >
                                          True
                                        </button>
                                        <button
                                          onClick={() => {
                                            const newStatements = [
                                              ...(module.content
                                                .trueFalseStatements || []),
                                            ];
                                            newStatements[i] = {
                                              ...newStatements[i],
                                              isTrue: false,
                                            };
                                            updateModuleContent(module.id, {
                                              trueFalseStatements:
                                                newStatements,
                                            });
                                          }}
                                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                            !statement.isTrue
                                              ? "bg-red-500 text-white"
                                              : "bg-slate-100 text-slate-600 hover:bg-red-100"
                                          }`}
                                        >
                                          False
                                        </button>
                                        {module.content.trueFalseStatements &&
                                          module.content.trueFalseStatements
                                            .length > 1 && (
                                            <button
                                              onClick={() => {
                                                const newStatements =
                                                  module.content.trueFalseStatements?.filter(
                                                    (_, idx) => idx !== i,
                                                  ) || [];
                                                updateModuleContent(module.id, {
                                                  trueFalseStatements:
                                                    newStatements,
                                                });
                                              }}
                                              className="p-1 hover:bg-red-50 text-red-600 rounded"
                                            >
                                              <span className="material-symbols-outlined text-[18px]">
                                                close
                                              </span>
                                            </button>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const newStatements = [
                                  ...(module.content.trueFalseStatements || []),
                                  {
                                    id: Date.now().toString(),
                                    statement: "",
                                    isTrue: true,
                                  },
                                ];
                                updateModuleContent(module.id, {
                                  trueFalseStatements: newStatements,
                                });
                              }}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              + Add statement
                            </button>
                          </div>
                        )}

                        {/* IMAGE CHOICE MODULE */}
                        {module.type === "imagechoice" && (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={module.content.imageChoiceTitle || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  imageChoiceTitle: e.target.value,
                                })
                              }
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                              placeholder="Title (e.g., Look at the pictures and choose the correct words)"
                            />

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-slate-600 font-medium">
                                Image Items
                              </p>
                              <button
                                onClick={() => {
                                  const newItem: ImageChoiceItem = {
                                    id: Date.now().toString(),
                                    imageUrl: "",
                                    imageName: "",
                                    correctOption: "",
                                    options: ["", "", ""],
                                  };
                                  updateModuleContent(module.id, {
                                    imageChoiceItems: [
                                      ...(module.content.imageChoiceItems ||
                                        []),
                                      newItem,
                                    ],
                                  });
                                }}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  add
                                </span>
                                Add Image
                              </button>
                            </div>

                            {(!module.content.imageChoiceItems ||
                              module.content.imageChoiceItems.length === 0) && (
                              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                                  imagesmode
                                </span>
                                <p className="text-sm text-slate-400">
                                  No images yet. Click "Add Image" to get
                                  started.
                                </p>
                              </div>
                            )}

                            {/* Image Choice Items Grid */}
                            {module.content.imageChoiceItems &&
                              module.content.imageChoiceItems.length > 0 && (
                                <div
                                  className={`grid gap-4 ${
                                    module.content.imageChoiceItems.length === 1
                                      ? "grid-cols-1 max-w-md mx-auto"
                                      : module.content.imageChoiceItems
                                            .length === 2
                                        ? "grid-cols-2"
                                        : "grid-cols-2 lg:grid-cols-3"
                                  }`}
                                >
                                  {module.content.imageChoiceItems.map(
                                    (item, index) => (
                                      <div
                                        key={item.id}
                                        className="bg-white p-3 rounded-lg border-2 border-sky-200"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs font-semibold text-sky-700">
                                            Image {index + 1}
                                          </span>
                                          <button
                                            onClick={() => {
                                              const newItems =
                                                module.content.imageChoiceItems?.filter(
                                                  (i) => i.id !== item.id,
                                                ) || [];
                                              updateModuleContent(module.id, {
                                                imageChoiceItems: newItems,
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <span className="material-symbols-outlined text-sm">
                                              delete
                                            </span>
                                          </button>
                                        </div>

                                        {/* Image Upload/Preview */}
                                        {item.imageUrl ? (
                                          <div className="relative group mb-3">
                                            <img
                                              src={item.imageUrl}
                                              alt=""
                                              className="w-full aspect-square object-cover rounded-lg"
                                            />
                                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                                              <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                  const file =
                                                    e.target.files?.[0];
                                                  if (file) {
                                                    const { processedFile } =
                                                      await processFileForUpload(
                                                        file,
                                                      );
                                                    const lessonId =
                                                      actualLessonId ||
                                                      (params.id as string);
                                                    const { url } =
                                                      await uploadFile(
                                                        processedFile,
                                                        `lessons/${params.level}/${lessonId}`,
                                                      );
                                                    if (url) {
                                                      const newItems =
                                                        module.content.imageChoiceItems?.map(
                                                          (i) =>
                                                            i.id === item.id
                                                              ? {
                                                                  ...i,
                                                                  imageUrl: url,
                                                                  imageName:
                                                                    file.name,
                                                                }
                                                              : i,
                                                        ) || [];
                                                      updateModuleContent(
                                                        module.id,
                                                        {
                                                          imageChoiceItems:
                                                            newItems,
                                                        },
                                                      );
                                                    }
                                                  }
                                                }}
                                                className="hidden"
                                              />
                                              <span className="text-white text-xs font-medium">
                                                Change Image
                                              </span>
                                            </label>
                                          </div>
                                        ) : (
                                          <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-sky-300 rounded-lg cursor-pointer hover:bg-sky-50/50 mb-3">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={async (e) => {
                                                const file =
                                                  e.target.files?.[0];
                                                if (file) {
                                                  const { processedFile } =
                                                    await processFileForUpload(
                                                      file,
                                                    );
                                                  const lessonId =
                                                    actualLessonId ||
                                                    (params.id as string);
                                                  const { url } =
                                                    await uploadFile(
                                                      processedFile,
                                                      `lessons/${params.level}/${lessonId}`,
                                                    );
                                                  if (url) {
                                                    const newItems =
                                                      module.content.imageChoiceItems?.map(
                                                        (i) =>
                                                          i.id === item.id
                                                            ? {
                                                                ...i,
                                                                imageUrl: url,
                                                                imageName:
                                                                  file.name,
                                                              }
                                                            : i,
                                                      ) || [];
                                                    updateModuleContent(
                                                      module.id,
                                                      {
                                                        imageChoiceItems:
                                                          newItems,
                                                      },
                                                    );
                                                  }
                                                }
                                              }}
                                              className="hidden"
                                            />
                                            <span className="material-symbols-outlined text-3xl text-sky-300 mb-1">
                                              add_photo_alternate
                                            </span>
                                            <span className="text-xs text-sky-500">
                                              Upload image
                                            </span>
                                          </label>
                                        )}

                                        {/* Correct Answer */}
                                        <input
                                          type="text"
                                          value={item.correctOption}
                                          onChange={(e) => {
                                            const newItems =
                                              module.content.imageChoiceItems?.map(
                                                (i) =>
                                                  i.id === item.id
                                                    ? {
                                                        ...i,
                                                        correctOption:
                                                          e.target.value,
                                                      }
                                                    : i,
                                              ) || [];
                                            updateModuleContent(module.id, {
                                              imageChoiceItems: newItems,
                                            });
                                          }}
                                          className="w-full bg-green-50 border border-green-300 rounded px-2 py-1.5 text-sm mb-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                          placeholder="Correct answer"
                                        />

                                        {/* Wrong Options */}
                                        <div className="space-y-1.5">
                                          {item.options.map((opt, optIndex) => (
                                            <input
                                              key={optIndex}
                                              type="text"
                                              value={opt}
                                              onChange={(e) => {
                                                const newOptions = [
                                                  ...item.options,
                                                ];
                                                newOptions[optIndex] =
                                                  e.target.value;
                                                const newItems =
                                                  module.content.imageChoiceItems?.map(
                                                    (i) =>
                                                      i.id === item.id
                                                        ? {
                                                            ...i,
                                                            options: newOptions,
                                                          }
                                                        : i,
                                                  ) || [];
                                                updateModuleContent(module.id, {
                                                  imageChoiceItems: newItems,
                                                });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                              placeholder={`Wrong option ${optIndex + 1}`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                          </div>
                        )}

                        {/* INLINE CHOICE MODULE */}
                        {module.type === "inlinechoice" && (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={module.content.inlineChoiceTitle || ""}
                              onChange={(e) =>
                                updateModuleContent(module.id, {
                                  inlineChoiceTitle: e.target.value,
                                })
                              }
                              className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                              placeholder="Title (e.g., Read each sentence and choose the correct word)"
                            />

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-slate-600 font-medium">
                                Sentences
                              </p>
                              <button
                                onClick={() => {
                                  const newSentence: InlineChoiceSentence = {
                                    id: Date.now().toString(),
                                    text: "",
                                    blanks: [
                                      { correctAnswer: "", options: ["", ""] },
                                    ],
                                  };
                                  updateModuleContent(module.id, {
                                    inlineChoiceSentences: [
                                      ...(module.content
                                        .inlineChoiceSentences || []),
                                      newSentence,
                                    ],
                                  });
                                }}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  add
                                </span>
                                Add Sentence
                              </button>
                            </div>

                            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                              Use{" "}
                              <code className="bg-slate-200 px-1 rounded">
                                1.
                              </code>
                              ,{" "}
                              <code className="bg-slate-200 px-1 rounded">
                                2.
                              </code>
                              , etc. to mark dropdown positions in your
                              sentence.
                            </p>

                            {/* Sentences List */}
                            <div className="space-y-4">
                              {module.content.inlineChoiceSentences?.map(
                                (sentence, sentenceIndex) => (
                                  <div
                                    key={sentence.id}
                                    className="bg-white p-4 rounded-lg border-2 border-violet-200"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-semibold text-violet-700">
                                        {sentenceIndex + 1}.
                                      </span>
                                      {module.content.inlineChoiceSentences &&
                                        module.content.inlineChoiceSentences
                                          .length > 1 && (
                                          <button
                                            onClick={() => {
                                              const newSentences =
                                                module.content.inlineChoiceSentences?.filter(
                                                  (s) => s.id !== sentence.id,
                                                ) || [];
                                              updateModuleContent(module.id, {
                                                inlineChoiceSentences:
                                                  newSentences,
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <span className="material-symbols-outlined text-sm">
                                              delete
                                            </span>
                                          </button>
                                        )}
                                    </div>

                                    {/* Sentence Text Toolbar */}
                                    <div className="flex items-center gap-2 mb-2">
                                      {/* Add Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const textarea =
                                            document.getElementById(
                                              `inlinechoice-textarea-${sentence.id}`,
                                            ) as HTMLTextAreaElement;
                                          if (textarea) {
                                            const start =
                                              textarea.selectionStart;
                                            const text = sentence.text || "";
                                            // Count existing blanks to determine next number
                                            const matches =
                                              text.match(/\d+\./g) || [];
                                            const nextNum = matches.length + 1;
                                            const newText =
                                              text.substring(0, start) +
                                              `${nextNum}.` +
                                              text.substring(start);
                                            const newSentences =
                                              module.content.inlineChoiceSentences?.map(
                                                (s) =>
                                                  s.id === sentence.id
                                                    ? { ...s, text: newText }
                                                    : s,
                                              ) || [];
                                            updateModuleContent(module.id, {
                                              inlineChoiceSentences:
                                                newSentences,
                                            });
                                            // Focus back and set cursor position
                                            setTimeout(() => {
                                              textarea.focus();
                                              const newPos =
                                                start + `${nextNum}.`.length;
                                              textarea.setSelectionRange(
                                                newPos,
                                                newPos,
                                              );
                                            }, 0);
                                          }
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors text-sm"
                                        title="Add blank (1., 2., etc.)"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          add
                                        </span>
                                        <span className="text-xs font-medium">
                                          Add
                                        </span>
                                      </button>

                                      <div className="w-px h-5 bg-slate-200" />

                                      {/* Bold Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const textarea =
                                            document.getElementById(
                                              `inlinechoice-textarea-${sentence.id}`,
                                            ) as HTMLTextAreaElement;
                                          if (textarea) {
                                            const start =
                                              textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const text = sentence.text || "";
                                            const selectedText = text.substring(
                                              start,
                                              end,
                                            );
                                            if (selectedText) {
                                              const newText =
                                                text.substring(0, start) +
                                                `**${selectedText}**` +
                                                text.substring(end);
                                              const newSentences =
                                                module.content.inlineChoiceSentences?.map(
                                                  (s) =>
                                                    s.id === sentence.id
                                                      ? { ...s, text: newText }
                                                      : s,
                                                ) || [];
                                              updateModuleContent(module.id, {
                                                inlineChoiceSentences:
                                                  newSentences,
                                              });
                                            }
                                          }
                                        }}
                                        className="flex items-center justify-center size-7 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                        title="Bold (select text first)"
                                      >
                                        <span className="font-bold text-xs">
                                          B
                                        </span>
                                      </button>

                                      {/* Italic Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const textarea =
                                            document.getElementById(
                                              `inlinechoice-textarea-${sentence.id}`,
                                            ) as HTMLTextAreaElement;
                                          if (textarea) {
                                            const start =
                                              textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const text = sentence.text || "";
                                            const selectedText = text.substring(
                                              start,
                                              end,
                                            );
                                            if (selectedText) {
                                              const newText =
                                                text.substring(0, start) +
                                                `*${selectedText}*` +
                                                text.substring(end);
                                              const newSentences =
                                                module.content.inlineChoiceSentences?.map(
                                                  (s) =>
                                                    s.id === sentence.id
                                                      ? { ...s, text: newText }
                                                      : s,
                                                ) || [];
                                              updateModuleContent(module.id, {
                                                inlineChoiceSentences:
                                                  newSentences,
                                              });
                                            }
                                          }
                                        }}
                                        className="flex items-center justify-center size-7 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                        title="Italic (select text first)"
                                      >
                                        <span className="italic text-xs">
                                          I
                                        </span>
                                      </button>

                                      {/* Underline Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const textarea =
                                            document.getElementById(
                                              `inlinechoice-textarea-${sentence.id}`,
                                            ) as HTMLTextAreaElement;
                                          if (textarea) {
                                            const start =
                                              textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const text = sentence.text || "";
                                            const selectedText = text.substring(
                                              start,
                                              end,
                                            );
                                            if (selectedText) {
                                              const newText =
                                                text.substring(0, start) +
                                                `__${selectedText}__` +
                                                text.substring(end);
                                              const newSentences =
                                                module.content.inlineChoiceSentences?.map(
                                                  (s) =>
                                                    s.id === sentence.id
                                                      ? { ...s, text: newText }
                                                      : s,
                                                ) || [];
                                              updateModuleContent(module.id, {
                                                inlineChoiceSentences:
                                                  newSentences,
                                              });
                                            }
                                          }
                                        }}
                                        className="flex items-center justify-center size-7 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                        title="Underline (select text first)"
                                      >
                                        <span className="underline text-xs">
                                          U
                                        </span>
                                      </button>
                                    </div>

                                    {/* Sentence Text */}
                                    <textarea
                                      id={`inlinechoice-textarea-${sentence.id}`}
                                      value={sentence.text}
                                      onChange={(e) => {
                                        const newSentences =
                                          module.content.inlineChoiceSentences?.map(
                                            (s) =>
                                              s.id === sentence.id
                                                ? { ...s, text: e.target.value }
                                                : s,
                                          ) || [];
                                        updateModuleContent(module.id, {
                                          inlineChoiceSentences: newSentences,
                                        });
                                      }}
                                      className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                                      placeholder="Enter sentence with 1., 2. for dropdowns. E.g.: The cat 1. on the mat."
                                      rows={4}
                                    />

                                    {/* Blanks */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600 font-medium">
                                          Dropdown Options
                                        </span>
                                        <button
                                          onClick={() => {
                                            const newBlanks = [
                                              ...sentence.blanks,
                                              {
                                                correctAnswer: "",
                                                options: ["", ""],
                                              },
                                            ];
                                            const newSentences =
                                              module.content.inlineChoiceSentences?.map(
                                                (s) =>
                                                  s.id === sentence.id
                                                    ? {
                                                        ...s,
                                                        blanks: newBlanks,
                                                      }
                                                    : s,
                                              ) || [];
                                            updateModuleContent(module.id, {
                                              inlineChoiceSentences:
                                                newSentences,
                                            });
                                          }}
                                          className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                                        >
                                          + Add dropdown
                                        </button>
                                      </div>

                                      {sentence.blanks.map(
                                        (blank, blankIndex) => (
                                          <div
                                            key={blankIndex}
                                            className="bg-violet-50 p-3 rounded-lg"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs font-medium text-violet-600">
                                                Dropdown {blankIndex + 1}.
                                              </span>
                                              {sentence.blanks.length > 1 && (
                                                <button
                                                  onClick={() => {
                                                    const newBlanks =
                                                      sentence.blanks.filter(
                                                        (_, i) =>
                                                          i !== blankIndex,
                                                      );
                                                    const newSentences =
                                                      module.content.inlineChoiceSentences?.map(
                                                        (s) =>
                                                          s.id === sentence.id
                                                            ? {
                                                                ...s,
                                                                blanks:
                                                                  newBlanks,
                                                              }
                                                            : s,
                                                      ) || [];
                                                    updateModuleContent(
                                                      module.id,
                                                      {
                                                        inlineChoiceSentences:
                                                          newSentences,
                                                      },
                                                    );
                                                  }}
                                                  className="text-red-500 hover:text-red-700"
                                                >
                                                  <span className="material-symbols-outlined text-[14px]">
                                                    close
                                                  </span>
                                                </button>
                                              )}
                                            </div>
                                            <input
                                              type="text"
                                              value={blank.correctAnswer}
                                              onChange={(e) => {
                                                const newBlanks = [
                                                  ...sentence.blanks,
                                                ];
                                                newBlanks[blankIndex] = {
                                                  ...newBlanks[blankIndex],
                                                  correctAnswer: e.target.value,
                                                };
                                                const newSentences =
                                                  module.content.inlineChoiceSentences?.map(
                                                    (s) =>
                                                      s.id === sentence.id
                                                        ? {
                                                            ...s,
                                                            blanks: newBlanks,
                                                          }
                                                        : s,
                                                  ) || [];
                                                updateModuleContent(module.id, {
                                                  inlineChoiceSentences:
                                                    newSentences,
                                                });
                                              }}
                                              className="w-full bg-green-50 border border-green-300 rounded px-2 py-1.5 text-sm mb-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                              placeholder="Correct answer"
                                            />
                                            <div className="flex gap-2 flex-wrap">
                                              {blank.options.map(
                                                (opt, optIndex) => (
                                                  <input
                                                    key={optIndex}
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                      const newOptions = [
                                                        ...blank.options,
                                                      ];
                                                      newOptions[optIndex] =
                                                        e.target.value;
                                                      const newBlanks = [
                                                        ...sentence.blanks,
                                                      ];
                                                      newBlanks[blankIndex] = {
                                                        ...newBlanks[
                                                          blankIndex
                                                        ],
                                                        options: newOptions,
                                                      };
                                                      const newSentences =
                                                        module.content.inlineChoiceSentences?.map(
                                                          (s) =>
                                                            s.id === sentence.id
                                                              ? {
                                                                  ...s,
                                                                  blanks:
                                                                    newBlanks,
                                                                }
                                                              : s,
                                                        ) || [];
                                                      updateModuleContent(
                                                        module.id,
                                                        {
                                                          inlineChoiceSentences:
                                                            newSentences,
                                                        },
                                                      );
                                                    }}
                                                    className="flex-1 min-w-[100px] bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                                    placeholder={`Wrong ${optIndex + 1}`}
                                                  />
                                                ),
                                              )}
                                              <button
                                                onClick={() => {
                                                  const newOptions = [
                                                    ...blank.options,
                                                    "",
                                                  ];
                                                  const newBlanks = [
                                                    ...sentence.blanks,
                                                  ];
                                                  newBlanks[blankIndex] = {
                                                    ...newBlanks[blankIndex],
                                                    options: newOptions,
                                                  };
                                                  const newSentences =
                                                    module.content.inlineChoiceSentences?.map(
                                                      (s) =>
                                                        s.id === sentence.id
                                                          ? {
                                                              ...s,
                                                              blanks: newBlanks,
                                                            }
                                                          : s,
                                                    ) || [];
                                                  updateModuleContent(
                                                    module.id,
                                                    {
                                                      inlineChoiceSentences:
                                                        newSentences,
                                                    },
                                                  );
                                                }}
                                                className="px-2 py-1.5 text-violet-600 hover:bg-violet-100 rounded text-xs"
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {/* AUDIO MODULE */}
                        {module.type === "audio" && (
                          <div className="space-y-4">
                            {/* Playback Mode Selector */}
                            <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
                              <span className="text-sm font-medium text-slate-700">Playback Mode:</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateModuleContent(module.id, { audioPlayMode: "controls" })}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                                    (module.content.audioPlayMode || "controls") === "controls"
                                      ? "bg-green-600 text-white"
                                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">tune</span>
                                  Full Player
                                </button>
                                <button
                                  onClick={() => updateModuleContent(module.id, { audioPlayMode: "click" })}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                                    module.content.audioPlayMode === "click"
                                      ? "bg-green-600 text-white"
                                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">touch_app</span>
                                  Click to Play
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 -mt-2">
                              {module.content.audioPlayMode === "click"
                                ? "Click to Play: Ideal for short audio (words, short phrases)"
                                : "Full Player: Ideal for longer audio (with pause, seek controls)"}
                            </p>

                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm text-slate-600 font-medium">
                                Audio Items
                              </p>
                              <button
                                onClick={() => addAudioItem(module.id)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  add
                                </span>
                                Add Audio
                              </button>
                            </div>

                            {(!module.content.audioItems ||
                              module.content.audioItems.length === 0) && (
                              <div
                                className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200 transition-colors hover:border-green-300 hover:bg-green-50/30"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.add(
                                    "border-green-500",
                                    "bg-green-50",
                                  );
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove(
                                    "border-green-500",
                                    "bg-green-50",
                                  );
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.remove(
                                    "border-green-500",
                                    "bg-green-50",
                                  );
                                  const fileData =
                                    e.dataTransfer.getData("library-file");
                                  if (fileData) {
                                    try {
                                      const file = JSON.parse(fileData);
                                      if (file.type === "audio") {
                                        addAudioItem(module.id);
                                        setTimeout(() => {
                                          const audioItems = modules.find(
                                            (m) => m.id === module.id,
                                          )?.content.audioItems;
                                          if (
                                            audioItems &&
                                            audioItems.length > 0
                                          ) {
                                            const lastItem =
                                              audioItems[audioItems.length - 1];
                                            updateModuleContent(module.id, {
                                              audioItems: audioItems.map(
                                                (item: any) =>
                                                  item.id === lastItem.id
                                                    ? {
                                                        ...item,
                                                        audioUrl: file.url,
                                                        audioName: file.name,
                                                      }
                                                    : item,
                                              ),
                                            });
                                          }
                                        }, 50);
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to parse dropped file:",
                                        err,
                                      );
                                    }
                                  }
                                }}
                              >
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                                  volume_up
                                </span>
                                <p className="text-sm text-slate-400">
                                  No audio items yet. Click &quot;Add
                                  Audio&quot; or drag from Library.
                                </p>
                              </div>
                            )}

                            <div className="space-y-3">
                              {module.content.audioItems?.map((item, index) => (
                                <div
                                  key={item.id}
                                  className="bg-white p-4 rounded-lg border-2 border-green-200"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-semibold text-green-700">
                                      Audio {index + 1}
                                    </span>
                                    <button
                                      onClick={() =>
                                        removeAudioItem(module.id, item.id)
                                      }
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        delete
                                      </span>
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) =>
                                      updateAudioItemTitle(
                                        module.id,
                                        item.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Title (e.g., Cześć, Dzień dobry)"
                                  />

                                  {item.audioUrl ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-600 text-sm">
                                          check_circle
                                        </span>
                                        <span className="text-xs text-slate-600">
                                          {item.audioName}
                                        </span>
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
                                            if (file)
                                              handleAudioItemUpload(
                                                module.id,
                                                item.id,
                                                file,
                                              );
                                          }}
                                          className="hidden"
                                        />
                                        <span className="text-xs text-green-600 hover:text-green-700 cursor-pointer underline">
                                          Change audio
                                        </span>
                                      </label>
                                    </div>
                                  ) : (
                                    <div
                                      className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-50/50 transition-colors"
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.classList.add(
                                          "border-green-500",
                                          "bg-green-100",
                                        );
                                      }}
                                      onDragLeave={(e) => {
                                        e.currentTarget.classList.remove(
                                          "border-green-500",
                                          "bg-green-100",
                                        );
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.classList.remove(
                                          "border-green-500",
                                          "bg-green-100",
                                        );
                                        const fileData =
                                          e.dataTransfer.getData(
                                            "library-file",
                                          );
                                        if (fileData) {
                                          try {
                                            const file = JSON.parse(fileData);
                                            if (
                                              file.type === "audio" &&
                                              module.content.audioItems
                                            ) {
                                              updateModuleContent(module.id, {
                                                audioItems:
                                                  module.content.audioItems.map(
                                                    (audioItem: any) =>
                                                      audioItem.id === item.id
                                                        ? {
                                                            ...audioItem,
                                                            audioUrl: file.url,
                                                            audioName:
                                                              file.name,
                                                          }
                                                        : audioItem,
                                                  ),
                                              });
                                            }
                                          } catch (err) {
                                            console.error(
                                              "Failed to parse dropped file:",
                                              err,
                                            );
                                          }
                                        }
                                      }}
                                    >
                                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                        <input
                                          type="file"
                                          accept="audio/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file)
                                              handleAudioItemUpload(
                                                module.id,
                                                item.id,
                                                file,
                                              );
                                          }}
                                          className="hidden"
                                        />
                                        <span className="material-symbols-outlined text-2xl text-green-400 mb-1">
                                          volume_up
                                        </span>
                                        <p className="text-xs text-slate-500">
                                          Upload or drag audio
                                        </p>
                                      </label>
                                    </div>
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
                              <p className="text-sm text-slate-600 font-medium">
                                Image Items
                              </p>
                              <button
                                onClick={() => addImageItem(module.id)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  add
                                </span>
                                Add Image
                              </button>
                            </div>

                            {(!module.content.imageItems ||
                              module.content.imageItems.length === 0) && (
                              <div
                                className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.add(
                                    "border-blue-500",
                                    "bg-blue-50",
                                  );
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove(
                                    "border-blue-500",
                                    "bg-blue-50",
                                  );
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.remove(
                                    "border-blue-500",
                                    "bg-blue-50",
                                  );
                                  const fileData =
                                    e.dataTransfer.getData("library-file");
                                  if (fileData) {
                                    try {
                                      const file = JSON.parse(fileData);
                                      if (file.type === "image") {
                                        addImageItem(module.id);
                                        // Use setTimeout to ensure the image item is added first
                                        setTimeout(() => {
                                          const imageItems = modules.find(
                                            (m) => m.id === module.id,
                                          )?.content.imageItems;
                                          if (
                                            imageItems &&
                                            imageItems.length > 0
                                          ) {
                                            const lastItem =
                                              imageItems[imageItems.length - 1];
                                            updateModuleContent(module.id, {
                                              imageItems: imageItems.map(
                                                (item: any) =>
                                                  item.id === lastItem.id
                                                    ? {
                                                        ...item,
                                                        imageUrl: file.url,
                                                      }
                                                    : item,
                                              ),
                                            });
                                          }
                                        }, 50);
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to parse dropped file:",
                                        err,
                                      );
                                    }
                                  }
                                }}
                              >
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                                  image
                                </span>
                                <p className="text-sm text-slate-400">
                                  No images yet. Click "Add Image" or drag from
                                  Library.
                                </p>
                              </div>
                            )}

                            <div
                              className={`grid gap-3 ${
                                module.content.imageItems?.length === 1
                                  ? "grid-cols-1 max-w-lg mx-auto"
                                  : "grid-cols-1 md:grid-cols-2"
                              }`}
                            >
                              {module.content.imageItems?.map((item, index) => (
                                <div
                                  key={item.id}
                                  className="bg-white p-4 rounded-lg border-2 border-blue-200"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-semibold text-blue-700">
                                      Image {index + 1}
                                    </span>
                                    <button
                                      onClick={() =>
                                        removeImageItem(module.id, item.id)
                                      }
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        delete
                                      </span>
                                    </button>
                                  </div>

                                  {item.imageUrl ? (
                                    <div className="space-y-2">
                                      <div
                                        className="relative"
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.currentTarget.classList.add(
                                            "ring-2",
                                            "ring-blue-500",
                                          );
                                        }}
                                        onDragLeave={(e) => {
                                          e.currentTarget.classList.remove(
                                            "ring-2",
                                            "ring-blue-500",
                                          );
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.currentTarget.classList.remove(
                                            "ring-2",
                                            "ring-blue-500",
                                          );
                                          const fileData =
                                            e.dataTransfer.getData(
                                              "library-file",
                                            );
                                          if (fileData) {
                                            try {
                                              const file = JSON.parse(fileData);
                                              if (
                                                file.type === "image" &&
                                                module.content.imageItems
                                              ) {
                                                updateModuleContent(module.id, {
                                                  imageItems:
                                                    module.content.imageItems.map(
                                                      (imgItem: any) =>
                                                        imgItem.id === item.id
                                                          ? {
                                                              ...imgItem,
                                                              imageUrl:
                                                                file.url,
                                                            }
                                                          : imgItem,
                                                    ),
                                                });
                                              }
                                            } catch (err) {
                                              console.error(
                                                "Failed to parse dropped file:",
                                                err,
                                              );
                                            }
                                          }
                                        }}
                                      >
                                        <img
                                          src={item.imageUrl}
                                          alt={item.caption || "Image"}
                                          className="w-full rounded-lg"
                                        />
                                        <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file)
                                                handleImageItemUpload(
                                                  module.id,
                                                  item.id,
                                                  file,
                                                );
                                            }}
                                            className="hidden"
                                          />
                                          <span className="text-white text-xs font-medium">
                                            Change Image
                                          </span>
                                        </label>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50/50 mb-2 transition-colors"
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.classList.add(
                                          "border-blue-500",
                                          "bg-blue-100",
                                        );
                                      }}
                                      onDragLeave={(e) => {
                                        e.currentTarget.classList.remove(
                                          "border-blue-500",
                                          "bg-blue-100",
                                        );
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.classList.remove(
                                          "border-blue-500",
                                          "bg-blue-100",
                                        );
                                        const fileData =
                                          e.dataTransfer.getData(
                                            "library-file",
                                          );
                                        if (fileData) {
                                          try {
                                            const file = JSON.parse(fileData);
                                            if (
                                              file.type === "image" &&
                                              module.content.imageItems
                                            ) {
                                              updateModuleContent(module.id, {
                                                imageItems:
                                                  module.content.imageItems.map(
                                                    (imgItem: any) =>
                                                      imgItem.id === item.id
                                                        ? {
                                                            ...imgItem,
                                                            imageUrl: file.url,
                                                          }
                                                        : imgItem,
                                                  ),
                                              });
                                            }
                                          } catch (err) {
                                            console.error(
                                              "Failed to parse dropped file:",
                                              err,
                                            );
                                          }
                                        }
                                      }}
                                    >
                                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file)
                                              handleImageItemUpload(
                                                module.id,
                                                item.id,
                                                file,
                                              );
                                          }}
                                          className="hidden"
                                        />
                                        <span className="material-symbols-outlined text-2xl text-blue-400 mb-1">
                                          image
                                        </span>
                                        <p className="text-xs text-slate-500">
                                          Upload or drag from Library
                                        </p>
                                      </label>
                                    </div>
                                  )}

                                  <input
                                    type="text"
                                    value={item.caption}
                                    onChange={(e) =>
                                      updateImageItemCaption(
                                        module.id,
                                        item.id,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Caption (e.g., Kot, Pies)"
                                  />

                                  {/* Orientation Selection */}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-slate-500">
                                      Orientation:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (module.content.imageItems) {
                                          updateModuleContent(module.id, {
                                            imageItems:
                                              module.content.imageItems.map(
                                                (imgItem: ImageItem) =>
                                                  imgItem.id === item.id
                                                    ? {
                                                        ...imgItem,
                                                        orientation:
                                                          "landscape",
                                                      }
                                                    : imgItem,
                                              ),
                                          });
                                        }
                                      }}
                                      className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                        (item.orientation || "landscape") ===
                                        "landscape"
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        crop_landscape
                                      </span>
                                      Landscape
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (module.content.imageItems) {
                                          updateModuleContent(module.id, {
                                            imageItems:
                                              module.content.imageItems.map(
                                                (imgItem: ImageItem) =>
                                                  imgItem.id === item.id
                                                    ? {
                                                        ...imgItem,
                                                        orientation: "portrait",
                                                      }
                                                    : imgItem,
                                              ),
                                          });
                                        }
                                      }}
                                      className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                        item.orientation === "portrait"
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        crop_portrait
                                      </span>
                                      Portrait
                                    </button>
                                  </div>
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
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-600">
                                      picture_as_pdf
                                    </span>
                                    <span className="text-sm font-medium">
                                      {module.content.pdfName}
                                    </span>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      // Delete from storage first
                                      if (module.content.pdfUrl) {
                                        try {
                                          const filePath = getFilePathFromUrl(
                                            module.content.pdfUrl,
                                          );
                                          if (filePath) {
                                            await deleteFile(filePath);
                                          }
                                        } catch (error) {
                                          console.error(
                                            "Failed to delete PDF from storage:",
                                            error,
                                          );
                                        }
                                      }
                                      updateModuleContent(module.id, {
                                        pdfUrl: undefined,
                                        pdfName: undefined,
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.add(
                                    "border-red-500",
                                    "bg-red-50",
                                  );
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove(
                                    "border-red-500",
                                    "bg-red-50",
                                  );
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.remove(
                                    "border-red-500",
                                    "bg-red-50",
                                  );
                                  const fileData =
                                    e.dataTransfer.getData("library-file");
                                  if (fileData) {
                                    try {
                                      const file = JSON.parse(fileData);
                                      if (file.type === "pdf") {
                                        updateModuleContent(module.id, {
                                          pdfUrl: file.url,
                                          pdfName: file.name,
                                        });
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to parse dropped file:",
                                        err,
                                      );
                                    }
                                  }
                                }}
                              >
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleFileUpload(
                                          module.id,
                                          "pdf",
                                          file,
                                        );
                                    }}
                                    className="hidden"
                                  />
                                  <span className="material-symbols-outlined text-3xl text-red-400 mb-2">
                                    picture_as_pdf
                                  </span>
                                  <p className="text-sm text-slate-500">
                                    Click to upload or drag PDF from Library
                                  </p>
                                </label>
                              </div>
                            )}
                          </>
                        )}

                        {/* WORDWALL MODULE */}
                        {module.type === "wordwall" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Wordwall Iframe Code:
                              </label>
                              <textarea
                                value={module.content.wordwallIframe || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    wordwallIframe: e.target.value,
                                  })
                                }
                                className="w-full min-h-[80px] bg-white rounded border border-slate-200 px-3 py-2 text-xs font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder='<iframe style="max-width:100%" src="https://wordwall.net/embed/..." width="500" height="380" frameborder="0"></iframe>'
                              />
                              <p className="text-xs text-slate-500">
                                From Wordwall, click &quot;Share&quot; →
                                &quot;Embed&quot; and paste the iframe code here
                              </p>
                            </div>
                            {module.content.wordwallIframe && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Wordwall activity configured
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* BAAMBOOZLE MODULE */}
                        {module.type === "baamboozle" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Baamboozle Link:
                              </label>
                              <input
                                type="text"
                                value={module.content.baamboozleUrl || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    baamboozleUrl: e.target.value,
                                  })
                                }
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="https://www.baamboozle.com/slideshow/2420286"
                              />
                              <p className="text-xs text-slate-500">
                                Paste game or slideshow link from Baamboozle
                              </p>
                            </div>
                            {module.content.baamboozleUrl && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Baamboozle activity configured
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* QUIZLET MODULE */}
                        {module.type === "quizlet" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Quizlet Iframe Code:
                              </label>
                              <textarea
                                value={module.content.quizletIframe || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    quizletIframe: e.target.value,
                                  })
                                }
                                className="w-full min-h-[80px] bg-white rounded border border-slate-200 px-3 py-2 text-xs font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder='<iframe src="https://quizlet.com/123456789/flashcards/embed?i=..." height="500" width="100%" style="border:0"></iframe>'
                              />
                              <p className="text-xs text-slate-500">
                                From Quizlet, click &quot;Share&quot; →
                                &quot;Embed&quot; and paste the iframe code here
                              </p>
                            </div>
                            {module.content.quizletIframe && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Quizlet set configured
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* GENIALLY MODULE */}
                        {module.type === "genially" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Genially Link:
                              </label>
                              <input
                                type="text"
                                value={module.content.geniallyUrl || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    geniallyUrl: e.target.value,
                                  })
                                }
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="https://view.genial.ly/..."
                              />
                              <p className="text-xs text-slate-500">
                                Paste the Genially view link
                              </p>
                            </div>
                            {module.content.geniallyUrl && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Genially presentation configured
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MIRO MODULE */}
                        {module.type === "miro" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Miro Board Link:
                              </label>
                              <input
                                type="text"
                                value={module.content.miroUrl || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    miroUrl: e.target.value,
                                  })
                                }
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="https://miro.com/app/board/..."
                              />
                              <p className="text-xs text-slate-500">
                                Paste the Miro board link
                              </p>
                            </div>
                            {module.content.miroUrl && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Miro board configured
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* YOUTUBE MODULE */}
                        {module.type === "youtube" && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                YouTube Video Link:
                              </label>
                              <input
                                type="text"
                                value={module.content.youtubeUrl || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    youtubeUrl: e.target.value,
                                  })
                                }
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                              />
                              <p className="text-xs text-slate-500">
                                Paste the YouTube video link
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Video Title (optional):
                              </label>
                              <input
                                type="text"
                                value={module.content.youtubeTitle || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    youtubeTitle: e.target.value,
                                  })
                                }
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Video title..."
                              />
                            </div>
                            {module.content.youtubeUrl && (
                              <div className="mt-4">
                                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${module.content.youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] || ''}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-xs text-green-700 font-medium">
                                    ✓ YouTube video configured
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* VOCABULARY MODULE */}
                        {module.type === "vocabulary" && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">
                                Section Title (optional):
                              </label>
                              <input
                                type="text"
                                value={module.content.vocabularyTitle || ""}
                                onChange={(e) =>
                                  updateModuleContent(module.id, {
                                    vocabularyTitle: e.target.value,
                                  })
                                }
                                className="w-full bg-white rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="e.g., Listen and repeat"
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-slate-600 font-medium">
                                Vocabulary Items
                              </p>
                              <button
                                onClick={() => addVocabularyItem(module.id)}
                                className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Add Word
                              </button>
                            </div>

                            {(!module.content.vocabularyItems || module.content.vocabularyItems.length === 0) && (
                              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">dictionary</span>
                                <p className="text-sm text-slate-400">
                                  No vocabulary items yet. Click &quot;Add Word&quot; to start.
                                </p>
                              </div>
                            )}

                            <div className="space-y-3">
                              {module.content.vocabularyItems?.map((item, index) => (
                                <div key={item.id} className="bg-white p-4 rounded-lg border-2 border-lime-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <span className="text-xs font-semibold text-lime-700">Word {index + 1}</span>
                                    <button
                                      onClick={() => removeVocabularyItem(module.id, item.id)}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Left: Image */}
                                    <div>
                                      <label className="text-xs font-medium text-slate-600 mb-1 block">Image</label>
                                      {item.imageUrl ? (
                                        <div className="relative">
                                          <img
                                            src={item.imageUrl}
                                            alt={item.word}
                                            className="w-full h-24 object-cover rounded-lg border border-slate-200"
                                          />
                                          <button
                                            onClick={async () => {
                                              const filePath = getFilePathFromUrl(item.imageUrl!);
                                              if (filePath) {
                                                try {
                                                  await deleteFile(filePath);
                                                } catch (err) {
                                                  console.error(err);
                                                }
                                              }
                                              updateVocabularyItem(module.id, item.id, "imageUrl", "");
                                              updateVocabularyItem(module.id, item.id, "imageName", "");
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-lime-400 hover:bg-lime-50/50 transition-colors">
                                          <span className="material-symbols-outlined text-slate-400 text-2xl">add_photo_alternate</span>
                                          <span className="text-xs text-slate-400 mt-1">Upload image</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleVocabularyImageUpload(module.id, item.id, file);
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>

                                    {/* Right: Audio */}
                                    <div>
                                      <label className="text-xs font-medium text-slate-600 mb-1 block">Audio</label>
                                      {item.audioUrl ? (
                                        <div className="relative">
                                          <div className="flex items-center gap-2 p-2 bg-lime-50 rounded-lg border border-lime-200">
                                            <button
                                              onClick={() => {
                                                const audio = new Audio(item.audioUrl);
                                                audio.play();
                                              }}
                                              className="size-10 rounded-full bg-lime-500 hover:bg-lime-600 flex items-center justify-center transition-colors"
                                            >
                                              <span className="material-symbols-outlined text-white text-xl">volume_up</span>
                                            </button>
                                            <span className="text-xs text-lime-700 truncate flex-1">{item.audioName}</span>
                                            <button
                                              onClick={async () => {
                                                const filePath = getFilePathFromUrl(item.audioUrl!);
                                                if (filePath) {
                                                  try {
                                                    await deleteFile(filePath);
                                                  } catch (err) {
                                                    console.error(err);
                                                  }
                                                }
                                                updateVocabularyItem(module.id, item.id, "audioUrl", "");
                                                updateVocabularyItem(module.id, item.id, "audioName", "");
                                              }}
                                              className="p-1 text-red-500 hover:text-red-700"
                                            >
                                              <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-lime-400 hover:bg-lime-50/50 transition-colors">
                                          <span className="material-symbols-outlined text-slate-400 text-2xl">mic</span>
                                          <span className="text-xs text-slate-400 mt-1">Upload audio</span>
                                          <input
                                            type="file"
                                            accept="audio/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleVocabularyAudioUpload(module.id, item.id, file);
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>

                                  {/* Word and Definition */}
                                  <div className="mt-3 space-y-2">
                                    <input
                                      type="text"
                                      value={item.word}
                                      onChange={(e) => updateVocabularyItem(module.id, item.id, "word", e.target.value)}
                                      className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                                      placeholder="Word (e.g., time zone)"
                                    />
                                    <input
                                      type="text"
                                      value={item.definition}
                                      onChange={(e) => updateVocabularyItem(module.id, item.id, "definition", e.target.value)}
                                      className="w-full bg-slate-50 rounded border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                                      placeholder="Definition (e.g., an area with the same standard time)"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
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
                <span className="material-symbols-outlined text-red-600 text-2xl">
                  warning
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Delete Lesson?
                </h3>
                <p className="text-sm text-slate-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong className="font-semibold">Warning:</strong> This will
                permanently delete:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">
                    check_circle
                  </span>
                  The lesson "{lessonTitle}"
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">
                    check_circle
                  </span>
                  All {modules.length} module{modules.length !== 1 ? "s" : ""}
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">
                    check_circle
                  </span>
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
